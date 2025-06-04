export default function handler(req, res) {
  // This replicates the behavior of "echo Hello World from your terminal!"
  const scriptOutput = "Hello World from your terminal!\n(executed by server-side function)";
  res.status(200).setHeader('Content-Type', 'text/plain').send(scriptOutput);
} 
