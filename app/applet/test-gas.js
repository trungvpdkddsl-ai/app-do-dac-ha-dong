fetch('https://script.google.com/macros/s/AKfycbwrizAcOq1WFJN5iForRBStQfl14kO5E-ALs_1kgnn1kZRUjSseeBmU-B2_CGbjRPVdXA/exec?action=getUsers')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
