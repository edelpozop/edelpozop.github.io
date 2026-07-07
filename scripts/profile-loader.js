async function loadProfile() {
  const headerContainer = document.getElementById('profile-header');
  if (!headerContainer) return;

  try {
    const res = await fetch('./content/profile.json');
    if (!res.ok) throw new Error('Failed to load profile.json');
    const p = await res.json();

    const logosHtml = (p.logos || []).map(l => `
      <a href="${l.url}" target="_blank" title="${l.title}" class="transition-transform hover:scale-105 block">
        <img src="${l.src}" alt="${l.alt}" class="${l.class} h-auto object-contain transition duration-300">
      </a>`).join('');

    headerContainer.innerHTML = `
      <div class="flex flex-col items-center gap-1 flex-shrink-0 w-52 self-center sm:self-start">
        <img src="${p.photo}" alt="${p.name}"
          class="w-52 h-64 rounded-full border-4 border-white shadow-lg object-cover">
        <div class="flex flex-col items-center justify-center gap-6 w-full mt-2">
          ${logosHtml}
        </div>
      </div>

      <div>
        <h1 class="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center sm:text-left">
          ${p.name}
        </h1>
        <p class="text-xl text-gray-600 font-light mb-4 text-center sm:text-left">${p.title}</p>

        <div class="flex flex-col gap-3 mt-8">
          <div class="flex items-center gap-3 text-gray-600">
            <i class="fa-solid fa-envelope w-6 text-center text-gray-500 flex-shrink-0"></i>
            <span>${p.email}</span>
          </div>
          <div class="flex items-center gap-3 text-gray-600">
            <i class="fa-solid fa-phone w-6 text-center text-gray-500 flex-shrink-0"></i>
            <span>${p.phone}</span>
          </div>
          <div class="flex items-center gap-3 text-gray-600">
            <i class="fa-solid fa-building w-6 text-center text-gray-500 flex-shrink-0"></i>
            <span class="contact-text-wrap">${p.affiliation}</span>
          </div>
          <div class="flex items-center gap-3 text-gray-600">
            <i class="fa-solid fa-location-dot w-6 text-center text-gray-500 flex-shrink-0"></i>
            <span>${p.address}</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    console.error('Error loading profile:', e);
    headerContainer.innerHTML = '<p class="text-red-400 italic text-sm">Error loading profile.</p>';
  }
}

loadProfile();
