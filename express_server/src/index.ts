import Websocket from "ws";
import { createClient } from "redis"
import Queue from "bull";
import express from "express";
import http from "http";
require('dotenv').config()

// Creating an express server
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// Creating a PUB/SUB using redis
const redisSubscriber = createClient();

// Connect to the redis pub/sub subscriber
(async () => {
    try {
        await redisSubscriber.connect();
        console.log("Redis subscriber connected successfully");

        // Subscribing to Redis pub/sub for listening to the taskResults event
        // When a message is published to the Redis pub/sub by the worker this code gets executed where it sends that message to all the subscribers
        redisSubscriber.subscribe("task_results", (message, channel) => {
            if (message) {
                console.log("Message received in redis subscriber: ", message);
                console.log("Message received from redis pub/sub channel: ", channel)
                const { userId, status, result, from, to, messageText } = JSON.parse(message);

                // Sending the result back to the clients
                connections.forEach((socket) => {
                    socket.send(JSON.stringify({ messageText }))
                })
            }
        });
        console.log("Subscribed to 'task_results' channel.");
    } catch (error) {
        console.error("Error while connecting to Redis subscriber: ", error);
    }
})();


// Creating a taskQueue using BullMQ for storing the requests and handling it one by one
// taskQueue is the name of the queue
const taskQueue = new Queue('taskQueue', {
    redis: { host: '127.0.0.1', port: 6379 }
});

// Creating an express server
const server = http.createServer(app);

// Websocket server
const wss = new Websocket.Server({ server });

// Map to store websocket connections
const connections = new Map();

wss.on("connection", (socket) => {
    console.log("New Websocket connection is established!!");

    // Assigning a unique ID to each connection
    const userId = Math.random().toString(36).substring(2, 15);
    connections.set(userId, socket);

    // Handling the messages from the client,
    // When a message is sent from the client
    socket.on("message", (message: string) => {
        console.log("Message received in socket: ", message.toString());
        const { from, to, messageText } = JSON.parse(message);

        taskQueue.add({ userId, from, to, messageText });
        console.log("Task added to queue for userId: ", userId);
    });

    // Removing the connection when it closes
    socket.on("close", () => {
        connections.delete(userId);
        console.log("Connection closed for userId: ", userId);
    })
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
