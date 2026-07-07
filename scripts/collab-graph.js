// ── Collaboration Graph Modal ─────────────────────────────────────────────────

(function () {
  const ORCID = '0000-0001-8679-6975';
  const MAX_COAUTHORS = 20;
  let graphDataCache = null;

  // Inject modal HTML once into the document
  function injectModal() {
    if (document.getElementById('collab-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'collab-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.7);backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div id="collab-modal-card" style="background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(15,23,42,0.25);width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f1f5f9;">
            <div>
              <h2 style="font-family:Merriweather,Georgia,serif;font-size:1.1rem;font-weight:700;color:#0f172a;margin:0;">Collaboration Network</h2>
              <p style="font-size:0.75rem;color:#94a3b8;margin:4px 0 0;" id="collab-subtitle">Loading from OpenAlex…</p>
            </div>
            <button id="close-collab-modal" title="Close"
              style="width:32px;height:32px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;font-size:1rem;color:#64748b;display:flex;align-items:center;justify-content:center;">
              ✕
            </button>
          </div>
          <div id="collab-graph-container" style="flex:1;overflow:hidden;position:relative;min-height:400px;background:#f8fafc;">
            <p style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.8rem;color:#94a3b8;font-style:italic;">Fetching data…</p>
          </div>
          <div style="padding:10px 20px;border-top:1px solid #f1f5f9;font-size:0.7rem;color:#94a3b8;">
            Data from <a href="https://openalex.org" target="_blank" style="color:#0f766e;">OpenAlex</a> · Drag nodes to explore · Hover for details
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Close handlers
    document.getElementById('close-collab-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.parentElement === modal.firstElementChild?.parentElement) {} });
    modal.firstElementChild.addEventListener('click', e => { if (e.target === modal.firstElementChild) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  function openModal() {
    const modal = document.getElementById('collab-modal');
    if (modal) { modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
  }

  function closeModal() {
    const modal = document.getElementById('collab-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
  }

  // Fetch & build graph data (cached after first load)
  async function fetchGraphData() {
    if (graphDataCache) return graphDataCache;

    const authorRes = await fetch(`https://api.openalex.org/authors?filter=orcid:${ORCID}`);
    if (!authorRes.ok) throw new Error('Author fetch failed');
    const authorData = await authorRes.json();
    if (!authorData.results?.length) throw new Error('Author not found');

    const author = authorData.results[0];
    const authorId = author.id;

    const worksRes = await fetch(
      `https://api.openalex.org/works?filter=authorships.author.id:${encodeURIComponent(authorId)}&per_page=100&select=id,authorships`
    );
    if (!worksRes.ok) throw new Error('Works fetch failed');
    const worksData = await worksRes.json();

    const coauthorMap = {};
    worksData.results.forEach(work => {
      work.authorships.forEach(a => {
        if (a.author.id !== authorId) {
          const id = a.author.id;
          if (!coauthorMap[id]) coauthorMap[id] = { id, name: a.author.display_name, count: 0 };
          coauthorMap[id].count++;
        }
      });
    });

    const topCoauthors = Object.values(coauthorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_COAUTHORS);

    graphDataCache = {
      author,
      authorId,
      nodes: [{ id: authorId, name: author.display_name, main: true, count: 0 }, ...topCoauthors],
      links: topCoauthors.map(c => ({ source: authorId, target: c.id, value: c.count })),
      totalWorks: worksData.meta?.count ?? worksData.results.length
    };
    return graphDataCache;
  }

  function renderGraph(graphData) {
    const container = document.getElementById('collab-graph-container');
    if (!container || typeof d3 === 'undefined') return;

    container.innerHTML = '';
    const w = container.offsetWidth || 860;
    const h = container.offsetHeight || 460;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .style('background', '#f8fafc');

    // Arrow marker (not used but kept for future)
    const defs = svg.append('defs');
    defs.append('radialGradient').attr('id', 'main-node-grad')
      .selectAll('stop')
      .data([{ offset: '0%', color: '#14b8a6' }, { offset: '100%', color: '#0f766e' }])
      .join('stop').attr('offset', d => d.offset).attr('stop-color', d => d.color);

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(d => 80 + (5 - Math.min(d.value, 5)) * 8).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius(d => d.main ? 28 : 18));

    const linkEl = svg.append('g').attr('stroke-linecap', 'round')
      .selectAll('line').data(graphData.links).join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', d => 0.8 + Math.min(d.value, 8) * 0.3);

    const nodeGroup = svg.append('g').selectAll('g').data(graphData.nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeGroup.append('circle')
      .attr('r', d => d.main ? 20 : 7 + Math.min(d.count * 1.2, 11))
      .attr('fill', d => d.main ? 'url(#main-node-grad)' : '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.main ? 3 : 2);

    // Name labels for all nodes
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.main ? 36 : (7 + Math.min(d.count * 1.2, 11)) + 12)
      .attr('font-size', d => d.main ? '11px' : '9px')
      .attr('font-weight', d => d.main ? '700' : '400')
      .attr('fill', d => d.main ? '#0f172a' : '#475569')
      .attr('pointer-events', 'none')
      .text(d => {
        if (d.main) return d.name.split(' ').slice(-2).join(' ');
        const parts = d.name.split(' ');
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : d.name;
      });

    // Initials on main node
    nodeGroup.filter(d => d.main).append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '8px').attr('font-weight', 'bold').attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text('E.D.P.');

    // Paper count badge on co-author nodes
    nodeGroup.filter(d => !d.main && d.count > 1).append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '6px').attr('fill', '#fff').attr('pointer-events', 'none')
      .text(d => d.count);

    // Tooltip
    nodeGroup.append('title').text(d =>
      d.main ? `${d.name}\n${graphData.totalWorks} publications` : `${d.name}\n${d.count} shared paper${d.count !== 1 ? 's' : ''}`
    );

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    simulation.on('tick', () => {
      linkEl
        .attr('x1', d => clamp(d.source.x, 5, w - 5)).attr('y1', d => clamp(d.source.y, 5, h - 5))
        .attr('x2', d => clamp(d.target.x, 5, w - 5)).attr('y2', d => clamp(d.target.y, 5, h - 5));
      nodeGroup.attr('transform', d => `translate(${clamp(d.x, 24, w - 24)},${clamp(d.y, 24, h - 40)})`);
    });
  }

  // Wire up button after DOM mutation (button injected by loadLinks)
  document.addEventListener('DOMContentLoaded', () => {
    injectModal();

    const observer = new MutationObserver(() => {
      const btn = document.getElementById('open-collab-graph');
      if (!btn) return;
      observer.disconnect();

      btn.addEventListener('click', async () => {
        openModal();
        if (graphDataCache) { renderGraph(graphDataCache); return; }

        try {
          const data = await fetchGraphData();
          const subtitle = document.getElementById('collab-subtitle');
          if (subtitle) subtitle.textContent = `${data.nodes.length - 1} co-authors · ${data.totalWorks} publications`;
          renderGraph(data);
        } catch (e) {
          console.error('Collab graph error:', e);
          const c = document.getElementById('collab-graph-container');
          if (c) c.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;font-style:italic;">Could not load collaboration data.</p>';
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
