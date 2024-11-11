let worker = null;
let results = []; // Store results for CSV export

document.getElementById('gearForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Clear previous results and initialize solution count
    let solutionCount = 0;
    results = []; // Clear stored results
    document.getElementById('solutionCount').textContent = 'Solutions found: 0';
    document.getElementById('results').textContent = '';
    document.getElementById('exportCsv').style.display = 'none';
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    const progress = document.getElementById('progress');
    loadingIndicator.classList.add('active');
    progress.style.display = 'block';
    
    // Terminate existing worker if any
    if (worker) {
        worker.terminate();
    }
    
    // Create new worker
    worker = new Worker('worker.js');
    
    // Get form values
    const params = {
        minPinion: parseInt(document.getElementById('minp').value),
        maxPinion: parseInt(document.getElementById('maxp').value),
        minWheel: parseInt(document.getElementById('minw').value),
        maxWheel: parseInt(document.getElementById('maxw').value),
        shafts: parseInt(document.getElementById('shafts').value),
        targetRatio: parseFloat(document.getElementById('ratio').value),
        tolerance: document.getElementById('allowTolerance').checked ? 
            parseFloat(document.getElementById('tol').value) : 0
    };
    
    // Send data to worker
    worker.postMessage(params);
    
    // Handle messages from worker
    worker.onmessage = function(e) {
        if (e.data.type === 'progress') {
            document.getElementById('progress').value = e.data.value;
            document.getElementById('progressPercent').textContent = 
                Math.round(e.data.value);
        } else if (e.data.type === 'result') {
            solutionCount++;
            results.push(e.data.result); // Store the structured result data
            document.getElementById('solutionCount').textContent = 
                `Solutions found: ${solutionCount}`;
            document.getElementById('results').textContent += e.data.text;
        } else if (e.data.type === 'complete') {
            loadingIndicator.classList.remove('active');
            if (solutionCount === 0) {
                document.getElementById('results').innerHTML = 'No solutions found.';
            } else {
                document.getElementById('exportCsv').style.display = 'block';
            }
            worker.terminate();
            worker = null;
        }
    };
});

// Add CSV export functionality
document.getElementById('exportCsv').addEventListener('click', function() {
    const csvContent = generateCsv(results);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gear_train_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function generateCsv(results) {
    // Create dynamic headers based on maximum number of shafts
    const maxShafts = Math.max(...results.map(r => r.wheels.length));
    const headers = ['Ratio'];
    for (let i = 0; i < maxShafts-1; i++) {
        headers.push(`Shaft ${i+1} wheel`, `Shaft ${i+2} pinion`);
    }
    
    let csv = headers.join(',') + '\n';
    
    // Create one row per solution
    results.forEach(result => {
        const row = [result.ratio];
        for (let i = 0; i < maxShafts; i++) {
            row.push(result.wheels[i] || '');
            if (i < maxShafts - 1) {
                row.push(result.pinions[i + 1] || '');
            }
        }
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

document.getElementById('allowTolerance').addEventListener('change', function(e) {
    document.getElementById('toleranceGroup').style.display = 
        e.target.checked ? 'block' : 'none';
}); 