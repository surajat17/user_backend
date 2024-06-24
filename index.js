const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')
const { faker } = require('@faker-js/faker');
const async = require('async');
require('dotenv').config();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB Atlas connection string from your .env file
const mongoUri = process.env.MONGO_URI;

// Connect to MongoDB Atlas
mongoose.connect(mongoUri, {

})
    .then(() => {
        console.log('MongoDB connected...');
        // Call function to populate dummy users
        // populateDummyUsers();
    })
    .catch(err => console.error('Connection error', err));

// Define a schema and model for the data
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    employeeId: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'manager', 'collector'] },
});

const User = mongoose.model('User', UserSchema);

function getRandomRole() {
    const roles = ['admin', 'manager', 'collector'];
    const randomIndex = Math.floor(Math.random() * roles.length);
    return roles[randomIndex];
}


function populateDummyUsers() {
    const totalUsers = 15000; // Total number of dummy users to create

    // Use async library to run tasks in parallel with a limit to prevent overwhelming MongoDB
    async.timesLimit(totalUsers, 10, (n, next) => {
        const dummyUser = {
            username: faker.internet.userName(),
            employeeId: faker.string.alphanumeric(6),
            email: faker.internet.email(),
            role: getRandomRole(),
        };

        // Create a new User document
        const newUser = new User(dummyUser);

        // Save the new user document
        newUser.save()
            .then(() => {
                console.log(`Created user: ${dummyUser.username}`);
                next();
            })
            .catch(err => {
                console.error(`Error creating user: ${dummyUser.username}`, err);
                next(err);
            });
    }, (err) => {
        if (err) {
            console.error('Error creating dummy users:', err);
        } else {
            console.log('Successfully created all dummy users.');
        }
        mongoose.disconnect(); // Disconnect from MongoDB after all tasks are completed
    });
}

// GET request to fetch all users
// GET request to fetch users with optional filters and pagination
app.get('/users', async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1; // Current page number, default: 1
        const limit = parseInt(req.query.limit) || 10; // Number of items per page, default: 10

        // Query parameters
        let query = {};

        // Check if username parameter exists in query
        if (req.query.username) {
            query.username = { $regex: new RegExp(req.query.username, 'i') }; // Case-insensitive regex match
        }

        // Check if role parameter exists in query
        if (req.query.role) {
            query.role = req.query.role;
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Execute the query with pagination
        const users = await User.find(query)
            .skip(skip)
            .limit(limit);

        // Count total number of documents matching the query (for pagination info)
        const totalCount = await User.countDocuments(query);

        // Prepare pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;

        // Response object with users and pagination info
        res.status(200).json({
            users,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                hasNextPage,
                limit
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// POST request to add a new user
app.post('/users', async (req, res) => {
    const newUser = new User({
        username: req.body.username,
        employeeId: req.body.employeeId,
        email: req.body.email,
        role: req.body.role,
    });

    try {
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



