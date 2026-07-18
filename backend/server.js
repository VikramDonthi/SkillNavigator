const express = require('express');
const cors = require('cors');
const app = express();
const data = require('./data.json');

app.use(cors());
app.use(express.json());

// Serve static files from the "frontend" folder
app.use(express.static('frontend'));

// Define the /get-jobs endpoint
app.post('/get-jobs', (req, res) => {
  console.log("Request Body:", req.body);
  const selectedSkills = req.body.skills;
  const matchingJobs = data.jobs.filter(job =>
    job.requiredSkills.some(skill => selectedSkills.includes(skill))
  );
  console.log("Matching Jobs:", matchingJobs);
  res.json(matchingJobs);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));