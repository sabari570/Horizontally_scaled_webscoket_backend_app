import Queue from "bull";
import { createClient } from "redis"

// Creating a redis pub/sub publisher
const redisPublisher = createClient();

// Connect to the redis pub/sub publisher
async function startWorker() {
    try {
        console.log("Worker activated!!!");
        await redisPublisher.connect();
        console.log("Redis publisher connected successfully");
    } catch (error) {
        console.error("Error while connecting to Redis publisher: ", error);
    }
}

// Task queue creating
const taskQueue = new Queue('taskQueue', {
    redis: { host: '127.0.0.1', port: 6379 }
});

// Worker to process the tasks inside queue
taskQueue.process(async (job) => {
    try {
        console.log("Job received at worker: ", job.data);
        const { userId, from, to, messageText } = job.data;

        console.log("Processing task or user: ", userId);

        // Perform the database operations over here
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const status = "Completed";
        const result = "Successfully saved message to database";

        await redisPublisher.publish("task_results", JSON.stringify({ userId, status, result, from, to, messageText }));
        console.log("Result published for user with userId: ", userId);
    } catch (error) {
        console.error("Error while publishing the message: ", error);
    }
});

startWorker();

