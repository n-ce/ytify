const { exec } = require('child_process');
const port = process.env.PORT || 4173;
exec(`vite preview --host 0.0.0.0 --port ${port}`, (error) => {
  if (error) console.error(`Error: ${error.message}`);
});
