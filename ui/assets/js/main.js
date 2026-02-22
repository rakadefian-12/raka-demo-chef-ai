document.addEventListener('DOMContentLoaded', () => {
  const recipeForm = document.getElementById('recipeForm');
  const generateBtn = document.getElementById('generateBtn');
  const recipeResult = document.getElementById('recipeResult');
  const emptyState = document.getElementById('emptyState');
  const btnText = document.querySelector('.btn-text');
  const btnLoading = document.querySelector('.btn-loading');

  recipeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Show loading state
    generateBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';

    // Simulate AI Processing
    setTimeout(() => {
      const ingredients = document.getElementById('ingredients').value;
      const mood = document.getElementById('mood').value;
      
      // Update UI
      emptyState.style.display = 'none';
      recipeResult.style.display = 'block';
      
      // Basic logic to show we processed something
      document.getElementById('recipeMood').textContent = mood.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      
      // Smooth scroll to result
      recipeResult.scrollIntoView({ behavior: 'smooth' });

      // Reset button
      generateBtn.disabled = false;
      btnText.style.display = 'inline-block';
      btnLoading.style.display = 'none';
    }, 1500);
  });

  // Share button interaction
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', () => {
    const title = document.getElementById('recipeTitle').textContent;
    const text = `Cek resep ${title} dari Ramadan Chef AI! \n\nSemoga berkah! 🌙`;
    alert('Resep siap dibagikan! \n\n' + text);
  });
});
