// Initialize inner content functionality
document.addEventListener('DOMContentLoaded', function() {
    // Set up the back button event listener for the inner content page
    document.getElementById('back-button').addEventListener('click', function() {
        const innerContent = document.getElementById('inner-content');
        
        // Fade out and hide the inner content
        innerContent.style.opacity = '0';
        
        setTimeout(() => {
            innerContent.style.display = 'none';
            
            // Return the model to its original scale and camera to original position
            // This is handled in main.js
            if (window.returnFromInnerContent) {
                window.returnFromInnerContent();
            }
        }, 500);
    });
});