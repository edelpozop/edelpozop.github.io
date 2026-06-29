async function loadPublications() {
  const container = document.getElementById('publications-list');

  try {
    const response = await fetch('./content/publications/publications.json');
    if (!response.ok) throw new Error('Error al cargar publications.json');

    const data = await response.json();
    container.innerHTML = '';

    // Journal Papers
    if (data.journalPapers && data.journalPapers.length > 0) {
      const journalHtml = `<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-4">Journal Papers</h3>`;
      container.insertAdjacentHTML('beforeend', journalHtml);
      
      data.journalPapers.sort((a, b) => b.year - a.year);
      data.journalPapers.forEach(pub => {
        const referenceText = pub.bibtex || `${pub.authors}. ${pub.title}. ${pub.journal}${pub.volume ? `, ${pub.volume}` : ''}${pub.pages ? `, ${pub.pages}` : ''} (${pub.year}). ${pub.doi || ''}`.trim();
        const html = `
          <div class="p-5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
            <div class="flex flex-col gap-3">
              <div class="flex items-start gap-3">
                <span class="block text-sm font-bold text-gray-500 min-w-12">${pub.year}</span>
                <div class="flex-grow">
                  <h4 class="text-base font-bold text-gray-900 leading-snug">${pub.title}</h4>
                  <p class="text-sm text-gray-600 mt-2">${pub.authors}</p>
                  <p class="text-sm text-gray-500 italic mt-1">${pub.journal}${pub.volume ? `, Vol. ${pub.volume}` : ''}${pub.pages ? `, pp. ${pub.pages}` : ''}${pub.issn ? `, ISSN: ${pub.issn}` : ''}</p>
                  <div class="mt-2 flex flex-wrap items-center gap-3">
                    ${pub.doi ? `<a href="${pub.doi.startsWith('http') ? pub.doi : 'https://doi.org/' + pub.doi}" target="_blank" class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"><i class="fa-solid fa-link mr-1"></i>DOI</a>` : ''}
                    <button type="button" class="copy-reference-btn text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline" data-reference="${encodeURIComponent(referenceText)}">
                      <i class="fa-regular fa-copy mr-1"></i>Copy reference
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });

      const copyButtons = container.querySelectorAll('.copy-reference-btn');
      copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
          const encodedReference = button.getAttribute('data-reference') || '';
          const reference = decodeURIComponent(encodedReference);

          try {
            await navigator.clipboard.writeText(reference);
          } catch (error) {
            const fallbackInput = document.createElement('textarea');
            fallbackInput.value = reference;
            document.body.appendChild(fallbackInput);
            fallbackInput.select();
            document.execCommand('copy');
            document.body.removeChild(fallbackInput);
          }

          const originalHtml = button.innerHTML;
          button.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Copied';
          setTimeout(() => {
            button.innerHTML = originalHtml;
          }, 1200);
        });
      });
    }

    // International Conference Papers
    if (data.internationalConferences && data.internationalConferences.length > 0) {
      const intConfHtml = `<h3 class="text-lg font-semibold text-gray-900 mt-8 mb-4">International Conference Papers</h3>`;
      container.insertAdjacentHTML('beforeend', intConfHtml);
      
      // Agrupar por año
      const byYear = {};
      data.internationalConferences.forEach(pub => {
        if (!byYear[pub.year]) byYear[pub.year] = [];
        byYear[pub.year].push(pub);
      });

      // Mostrar por año descendente
      Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
        const yearHtml = `<h4 class="text-base font-semibold text-gray-800 mt-4 mb-3">${year}</h4>`;
        container.insertAdjacentHTML('beforeend', yearHtml);
        
        byYear[year].forEach(pub => {
          const html = `
            <div class="p-5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
              <div class="flex flex-col gap-2">
                <h5 class="text-base font-bold text-gray-900 leading-snug">${pub.title}</h5>
                <p class="text-sm text-gray-600">${pub.authors}</p>
                <p class="text-sm text-gray-500">${pub.conference}${pub.location ? `, ${pub.location}` : ''}</p>
                ${pub.doi && pub.doi !== "" ? `<div><a href="${pub.doi.startsWith('http') ? pub.doi : 'https://doi.org/' + pub.doi}" target="_blank" class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"><i class="fa-solid fa-link mr-1"></i>DOI</a></div>` : ''}
              </div>
            </div>
          `;
          container.insertAdjacentHTML('beforeend', html);
        });
      });
    }

    // National Conference Papers
    if (data.nationalConferences && data.nationalConferences.length > 0) {
      const natConfHtml = `<h3 class="text-lg font-semibold text-gray-900 mt-8 mb-4">National Conference Papers</h3>`;
      container.insertAdjacentHTML('beforeend', natConfHtml);
      
      // Agrupar por año
      const byYear = {};
      data.nationalConferences.forEach(pub => {
        if (!byYear[pub.year]) byYear[pub.year] = [];
        byYear[pub.year].push(pub);
      });

      // Mostrar por año descendente
      Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
        const yearHtml = `<h4 class="text-base font-semibold text-gray-800 mt-4 mb-3">${year}</h4>`;
        container.insertAdjacentHTML('beforeend', yearHtml);
        
        byYear[year].forEach(pub => {
          const html = `
            <div class="p-5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
              <div class="flex flex-col gap-2">
                <h5 class="text-base font-bold text-gray-900 leading-snug">${pub.title}</h5>
                <p class="text-sm text-gray-600">${pub.authors}</p>
                <p class="text-sm text-gray-500">${pub.conference}${pub.location ? `, ${pub.location}` : ''}${pub.pages ? `, pp. ${pub.pages}` : ''}</p>
                ${pub.doi && pub.doi !== "" ? `<div><a href="${pub.doi.startsWith('http') ? pub.doi : 'https://doi.org/' + pub.doi}" target="_blank" class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"><i class="fa-solid fa-link mr-1"></i>DOI</a></div>` : ''}
              </div>
            </div>
          `;
          container.insertAdjacentHTML('beforeend', html);
        });
      });
    }

  } catch (error) {
    console.error("Error cargando las publicaciones del perfil:", error);
    container.innerHTML = '<p class="text-red-500 italic text-sm">Error loading publications. Please try again later.</p>';
  }
}

// Expandir todas las secciones.
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-all-btn');
  // Seleccionamos todos los elementos <details> que están dentro del contenedor principal
  const detailsElements = document.querySelectorAll('main details');
  let allExpanded = false;

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      allExpanded = !allExpanded; // Cambiamos el estado

      detailsElements.forEach(detail => {
        if (allExpanded) {
          detail.setAttribute('open', ''); // Expande
        } else {
          detail.removeAttribute('open'); // Colapsa
        }
      });

      // Actualizamos el texto y el icono del botón según el estado
      if (allExpanded) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-angles-up"></i><span>Collapse All</span>';
      } else {
        toggleBtn.innerHTML = '<i class="fa-solid fa-angles-down"></i><span>Expand All</span>';
      }
    });
  }

  // Auto-expand sections when clicking sidebar links
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const sectionId = href.substring(1);
        const detailsElement = document.getElementById(sectionId);
        if (detailsElement && detailsElement.tagName === 'DETAILS') {
          // Pequeña delay para que se vea el efecto
          setTimeout(() => {
            detailsElement.setAttribute('open', '');
            detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    });
  });

  // Handle thesis links - prevent default and prepare for user's URLs
  const thesisLinks = document.querySelectorAll('.thesis-link');
  thesisLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // The link href can be updated by the user with the actual thesis URL
      // For now, prevent the default behavior
    });
  });
});

// Ejecutar la función
loadPublications();
