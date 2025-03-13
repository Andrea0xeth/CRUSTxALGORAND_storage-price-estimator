document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const fileSizeSpan = document.getElementById('fileSize');
    const storageTypeSpan = document.getElementById('storageType');
    const priceInMicroAlgosSpan = document.getElementById('priceInMicroAlgos');
    const priceInAlgosSpan = document.getElementById('priceInAlgos');
    const errorMessageP = document.getElementById('errorMessage');
    
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset display
        resultsDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        loadingDiv.style.display = 'block';
        
        // Get form data
        const formData = new FormData(uploadForm);
        
        // Check if isPermanent is checked
        const isPermanentCheckbox = document.getElementById('isPermanent');
        formData.set('isPermanent', isPermanentCheckbox.checked.toString());
        
        try {
            const response = await fetch('/calculate-price', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                // Display error
                errorMessageP.textContent = data.message || data.error;
                errorDiv.style.display = 'block';
            } else {
                // Format the file size for display
                const formattedSize = formatFileSize(data.fileSize);
                fileSizeSpan.textContent = formattedSize;
                
                // Display storage type
                storageTypeSpan.textContent = data.isPermanent ? 'Permanent' : 'Temporary';
                
                // Display prices
                priceInMicroAlgosSpan.textContent = data.price.toLocaleString();
                priceInAlgosSpan.textContent = data.priceInAlgos.toLocaleString(undefined, {
                    minimumFractionDigits: 6,
                    maximumFractionDigits: 6
                });
                
                // Show results
                resultsDiv.style.display = 'block';
            }
        } catch (error) {
            // Display error
            console.error('Error:', error);
            errorMessageP.textContent = 'Failed to calculate price. Please try again.';
            errorDiv.style.display = 'block';
        } finally {
            // Hide loading
            loadingDiv.style.display = 'none';
        }
    });
    
    // Function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
    }
}); 