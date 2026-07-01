async function loadPublications() {
  const container = document.getElementById('publications-list');
  if (!container) return;

  const detailsClass = 'rounded-lg border border-gray-100 bg-white p-4 [&_summary::-webkit-details-marker]:hidden';

  const createSectionCard = (title, innerHtml, open = false) => `
    <details class="${detailsClass}" ${open ? 'open' : ''}>
      <summary class="flex items-center justify-between gap-2 cursor-pointer select-none">
        <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
        <span class="relative w-5 h-5 flex-shrink-0">
          <i class="fa-solid fa-chevron-down text-gray-400 transition-transform publication-chevron"></i>
        </span>
      </summary>
      <div class="mt-4">${innerHtml}</div>
    </details>
  `;

  const renderPublicationCard = (pub, venueText, includeCopyReference = false) => {
    const referenceText = pub.bibtex || `${pub.authors}. ${pub.title}. ${venueText} (${pub.year}). ${pub.doi || ''}`.trim();

    return `
      <div class="p-5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <span class="block text-sm font-bold text-gray-500 min-w-12">${pub.year}</span>
            <div class="flex-grow">
              <h4 class="text-base font-bold text-gray-900 leading-snug">${pub.title}</h4>
              <p class="text-sm text-gray-600 mt-2">${pub.authors}</p>
              <p class="text-sm text-gray-500 italic mt-1">${venueText}</p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                ${pub.doi ? `<a href="${pub.doi.startsWith('http') ? pub.doi : 'https://doi.org/' + pub.doi}" target="_blank" class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"><i class="fa-solid fa-link mr-1"></i>DOI</a>` : ''}
                ${includeCopyReference ? `<button type="button" class="copy-reference-btn text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline" data-reference="${encodeURIComponent(referenceText)}"><i class="fa-regular fa-copy mr-1"></i>Copy reference</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderConferenceSection = (items, title) => {
    const cardsHtml = items
      .sort((a, b) => b.year - a.year)
      .map(pub => {
        const venue = `${pub.conference}${pub.location ? `, ${pub.location}` : ''}${pub.pages ? `, pp. ${pub.pages}` : ''}`;
        return renderPublicationCard(pub, venue, false);
      })
      .join('');
    return createSectionCard(title, cardsHtml);
  };

  try {
    const response = await fetch('./content/publications/publications.json');
    if (!response.ok) throw new Error('Error al cargar publications.json');

    const data = await response.json();
    container.innerHTML = '';

    const sections = [];

    // Journal Papers
    if (data.journalPapers && data.journalPapers.length > 0) {
      const journalsHtml = data.journalPapers
        .sort((a, b) => b.year - a.year)
        .map(pub => {
          const venue = `${pub.journal}${pub.volume ? `, Vol. ${pub.volume}` : ''}${pub.pages ? `, pp. ${pub.pages}` : ''}${pub.issn ? `, ISSN: ${pub.issn}` : ''}`;
          return renderPublicationCard(pub, venue, true);
        })
        .join('');

      sections.push(createSectionCard('Journal Papers', journalsHtml, true));
    }

    // International Conference Papers
    if (data.internationalConferences && data.internationalConferences.length > 0) {
      sections.push(renderConferenceSection(data.internationalConferences, 'International Conference Papers'));
    }

    // National Conference Papers
    if (data.nationalConferences && data.nationalConferences.length > 0) {
      sections.push(renderConferenceSection(data.nationalConferences, 'National Conference Papers'));
    }

    if (sections.length > 0) {
      container.innerHTML = sections.join('');
    } else {
      container.innerHTML = '<p class="text-gray-400 italic">No publications available.</p>';
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

  // Highlight active section in mobile bottom nav
  const mobilePills = document.querySelectorAll('.mobile-nav-pill');
  if (mobilePills.length > 0 && 'IntersectionObserver' in window) {
    const sectionIds = ['about', 'positions', 'education', 'publications', 'teaching', 'projects', 'awards'];
    const sectionEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mobilePills.forEach(p => p.classList.remove('active'));
          const pill = document.querySelector(`.mobile-nav-pill[href="#${entry.target.id}"]`);
          if (pill) pill.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sectionEls.forEach(el => observer.observe(el));
  }

  // Handle thesis links - prevent default and prepare for user's URLs
  const thesisLinks = document.querySelectorAll('.thesis-link');
  thesisLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // The link href can be updated by the user with the actual thesis URL
      // For now, prevent the default behavior
    });
  });

  // Event delegation for dynamically rendered publication copy buttons
  const publicationsList = document.getElementById('publications-list');
  publicationsList?.addEventListener('click', async (event) => {
    const button = event.target.closest('.copy-reference-btn');
    if (!button) return;

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

// Ejecutar la función
loadPublications();
loadTeaching();

async function loadTeaching() {
  const container = document.getElementById('teaching-list');
  if (!container) return;

  const detailsClass = 'rounded-lg border border-gray-100 bg-white p-4 [&_summary::-webkit-details-marker]:hidden';

  const getRatingStyle = (rating) => {
    if (rating >= 4.0) return 'color:#0f766e;background:#f0fdfb;border:1px solid #99e6e0;';
    if (rating >= 3.5) return 'color:#4b5563;background:#f3f4f6;border:1px solid #d1d5db;';
    return 'color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;';
  };

  const renderCourseCard = (course) => {
    const types = course.teachingTypes || course.teachingType || [];
    const typeBadges = types
      .map(t => `<span style="font-size:0.72rem;padding:2px 8px;border-radius:9999px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;font-weight:500;">${t}</span>`)
      .join('');

    const groups = course.groups || [];
    const groupChips = groups.length > 0
      ? `<div class="mt-2 flex flex-wrap gap-2">
          ${groups.map(g =>
            `<span style="font-size:0.72rem;padding:2px 8px;border-radius:9999px;font-weight:500;${getRatingStyle(g.rating)}">
              Gr. ${g.id} &middot; ${g.rating.toFixed(2)}/5
            </span>`
          ).join('')}
         </div>`
      : '';

    const logoHtml = course.logo
      ? `<div class="flex-shrink-0 flex items-center justify-center" style="width:130px;">
           <img src="assets/logos/${course.logo}.png" alt="${course.institution}" style="max-height:100px;max-width:150px;" class="object-contain">
         </div>`
      : '';

    const courseLinkHtml = course.courseLink
      ? `<a target="_blank" href="${course.courseLink}" class="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all self-center">
           <i class="fa-solid fa-chalkboard-user text-xl"></i>
         </a>`
      : '';

    return `
      <div class="p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
        <div class="flex items-center gap-4">
          ${logoHtml}
          <div class="flex-grow">
            <div class="flex flex-wrap items-center gap-3">
              <h4 class="text-base font-bold text-gray-900">${course.name}</h4>
              <span class="text-sm text-gray-500">${course.period}</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">${course.institution}</p>
            <p class="text-sm text-gray-400 mt-1 italic">${course.degree}</p>
            <div class="mt-2 flex flex-wrap gap-2">${typeBadges}</div>
            ${groupChips}
          </div>
          ${courseLinkHtml}
        </div>
      </div>
    `;
  };

  try {
    const response = await fetch('./content/teaching/teaching.json');
    if (!response.ok) throw new Error('Error loading teaching.json');

    const data = await response.json();

    if (!data.teachingActivities || data.teachingActivities.length === 0) {
      container.innerHTML = '<p class="text-gray-400 italic">No teaching activities available.</p>';
      return;
    }

    // Flatten all courses with their academicYear
    const allCourses = [];
    data.teachingActivities.forEach(yearEntry => {
      yearEntry.courses.forEach(course => {
        allCourses.push({ ...course, academicYear: yearEntry.academicYear });
      });
    });

    // Group by institution → subject name
    const byInstitution = {};
    allCourses.forEach(c => {
      if (!byInstitution[c.institution]) {
        byInstitution[c.institution] = { logo: c.logo, subjects: {} };
      }
      const key = c.name + '|||' + (c.degree || '');
      if (!byInstitution[c.institution].subjects[key]) {
        byInstitution[c.institution].subjects[key] = {
          name: c.name,
          degree: c.degree || '',
          courseLink: c.courseLink || null,
          periods: []
        };
      }
      byInstitution[c.institution].subjects[key].periods.push({
        academicYear: c.academicYear,
        period: c.period,
        groups: c.groups || []
      });
    });

    const sections = Object.entries(byInstitution).map(([institution, instData]) => {
      const subjectCards = Object.values(instData.subjects).map(subject => {
        subject.periods.sort((a, b) => b.academicYear.localeCompare(a.academicYear));

        const periodsHtml = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;max-width:100%;">${
          subject.periods.map(p =>
            `<span style="font-size:0.7rem;padding:2px 8px;border-radius:9999px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;font-weight:500;white-space:nowrap;">${p.academicYear}</span>`
          ).join('')
        }</div>`;

        const courseLinkHtml = subject.courseLink
          ? `<a target="_blank" href="${subject.courseLink}" class="flex-shrink-0 ml-auto pl-3 p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all self-start">
               <i class="fa-solid fa-chalkboard-user text-lg"></i>
             </a>`
          : '';

        return `
          <div style="overflow:hidden;" class="p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-brand-200 transition-all mb-3">
            <div class="flex items-start">
              <div style="min-width:0;flex:1;">
                <h4 class="text-base font-bold text-gray-900">${subject.name}</h4>
                <p class="text-sm text-gray-400 italic mb-1">${subject.degree}</p>
                ${periodsHtml}
              </div>
              ${courseLinkHtml}
            </div>
          </div>`;
      }).join('');

    const logoHtml = instData.logo
      ? `<img src="assets/logos/${instData.logo}.png" alt="${institution}" class="flex-shrink-0 object-contain" style="max-height:32px;max-width:100px;">`
      : '';

      return `
        <details class="${detailsClass}">
          <summary class="flex items-center justify-between gap-3 cursor-pointer select-none">
            <div class="flex items-center gap-4">
              ${logoHtml}
              <h3 class="text-base font-semibold text-gray-900">${institution}</h3>
            </div>
            <span class="relative w-5 h-5 flex-shrink-0">
              <i class="fa-solid fa-chevron-down text-gray-400 transition-transform publication-chevron"></i>
            </span>
          </summary>
          <div class="mt-4">${subjectCards}</div>
        </details>`;
    });

    container.innerHTML = sections.join('');

    container.querySelectorAll('details').forEach(det => {
      det.addEventListener('toggle', () => {
        const chevron = det.querySelector(':scope > summary .publication-chevron');
        if (chevron) chevron.style.transform = det.open ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    });

  } catch (error) {
    console.error('Error loading teaching data:', error);
    container.innerHTML = '<p class="text-red-500 italic text-sm">Error loading teaching activities. Please try again later.</p>';
  }
}
