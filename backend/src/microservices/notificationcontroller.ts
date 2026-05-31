import { Queue } from "bullmq";


// create queue emails with redis connection

const myQueue = new Queue("emails", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

interface Email {
  id: number;
  user: number;
  email : string,
  template: string;
  service: "EMAIL";
  priority: number;
}

async function add_email(data: Email) {
  const result = await myQueue.add(
    "send-email",
    {
      payload: data,
    },
    {
      priority: data.priority,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );

  return result;
}

export { add_email };