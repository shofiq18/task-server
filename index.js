
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const http = require("http");
const socketIo = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI & Client Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log("Successfully connected to MongoDB!");

    const db = client.db("task_DB");
    const usersCollection = db.collection("users");
    const tasksCollection = db.collection("tasks");

    // **Store user details upon first login**
    app.post("/users", async (req, res) => {
      const { uid, email, displayName } = req.body;
      try {
        const existingUser = await usersCollection.findOne({ uid });
        if (!existingUser) {
          const newUser = { uid, email, displayName, createdAt: new Date() };
          const result = await usersCollection.insertOne(newUser);
          return res.status(201).json({ message: "User added successfully", result });
        }
        res.status(200).json({ message: "User already exists" });
      } catch (error) {
        console.error("Error storing user details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // **Add a new task**
    app.post("/tasks", async (req, res) => {
      const { title, description, category, userId } = req.body;
      try {
        const newTask = { title, description, category, userId, createdAt: new Date() };
        const result = await tasksCollection.insertOne(newTask);
        res.status(201).json({ message: "Task added successfully", taskId: result.insertedId });
      } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // **Fetch all tasks for a user**
    app.get("/tasks", async (req, res) => {
      const { userId } = req.query;
      try {
        const tasks = await tasksCollection.find({ userId }).toArray();
        res.status(200).json(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // **Update a task**
    app.put("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description, category } = req.body;
      try {
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { title, description, category, updatedAt: new Date() } }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Task not found" });
        }
        res.status(200).json({ message: "Task updated successfully" });
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // **Delete a task**
    app.delete("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Task not found" });
        }
        res.status(200).json({ message: "Task deleted successfully" });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // **Real-time task updates using MongoDB Change Streams**
    const taskChangeStream = tasksCollection.watch();
    taskChangeStream.on("change", (change) => {
      console.log("Task collection change detected:", change);
      // Emit task changes to all connected clients
      io.emit("taskUpdate", change.fullDocument);
    });

    // Socket.io setup for real-time communication
    io.on("connection", (socket) => {
      console.log("A user connected");

      // Send initial task data to new user on connection
      socket.emit("welcome", "Connected to real-time task updates!");

      socket.on("disconnect", () => {
        console.log("A user disconnected");
      });
    });

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

run().catch(console.dir);
