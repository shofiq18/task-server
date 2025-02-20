

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.mongodb.net/taskManagerDB?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
connectDB();

// MongoDB Collections
const db = client.db("taskManagerDB");
const usersCollection = db.collection("users");

// Routes

// Root Route
app.get("/", (req, res) => {
  res.send("Task Manager Backend is Running!");
});

// User Login Route
app.post("/users/login", async (req, res) => {
  try {
    const { userId, email, displayName } = req.body;

    if (!userId || !email || !displayName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the user exists
    const existingUser = await usersCollection.findOne({ userId });

    if (existingUser) {
      // Update user details if they already exist
      await usersCollection.updateOne(
        { userId },
        { $set: { email, displayName, lastLogin: new Date() } }
      );
    } else {
      // Add new user if not exists
      await usersCollection.insertOne({
        userId,
        email,
        displayName,
        createdAt: new Date(),
        lastLogin: new Date(),
      });
    }

    res.status(200).json({ success: true, message: "User stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to store user" });
  }
});

// Tasks CRUD Routes
const tasksCollection = db.collection("tasks");

// Add a New Task
app.post("/tasks", async (req, res) => {
  try {
    const { title, description, category, timestamp } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTask = { title, description, category, timestamp: timestamp || new Date() };

    const result = await tasksCollection.insertOne(newTask);
    res.status(201).json({ success: true, taskId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Get All Tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection.find({}).toArray();
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Update a Task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await tasksCollection.updateOne(
      { _id: new MongoClient.ObjectId(id) },
      { $set: { title, description, category } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete a Task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await tasksCollection.deleteOne({ _id: new MongoClient.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
