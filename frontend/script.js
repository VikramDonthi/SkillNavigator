async function calculateEmployability() {
  console.log("Submit button clicked!");
  const selectedSkills = Array.from(document.querySelectorAll('input[name="skill"]:checked'))
    .map(skill => skill.value);
  console.log("Selected Skills:", selectedSkills);

  if (selectedSkills.length === 0) {
    alert("Please select at least one skill!");
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/get-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: selectedSkills })
    });
    console.log("Response:", response);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jobs = await response.json();
    console.log("Jobs:", jobs);

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = jobs.map(job => `
      <div>
        <h3>${job.title} (${job.sector})</h3>
        <p>Companies: ${job.companies.join(', ')}</p>
        <p>Employability Score: ${job.employabilityScore}%</p>
        <p>Recruitment Process:</p>
        <ul>
          ${job.recruitmentProcess.map(step => `<li>${step}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please check the console for details.");
  }
}