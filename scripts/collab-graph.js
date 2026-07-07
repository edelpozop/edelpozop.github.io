// ── Collaboration Graph Modal ─────────────────────────────────────────────────

(function () {
  const ORCID = '0000-0001-8679-6975';
  const MAX_COAUTHORS = 20;
  let graphDataCache = null;

  // Distinct color palette for co-author nodes
  const NODE_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
    '#84cc16', '#e879f9', '#0ea5e9', '#fb7185', '#a78bfa',
    '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#4ade80'
  ];

  // Inject modal HTML once
  function injectModal() {
    if (document.getElementById('collab-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'collab-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;">
        <div id="collab-modal-card" style="background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(15,23,42,0.3);width:100%;max-width:1100px;height:90vh;display:flex;flex-direction:column;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #f1f5f9;flex-shrink:0;">
            <div>
              <h2 style="font-family:Merriweather,Georgia,serif;font-size:1.1rem;font-weight:700;color:#0f172a;margin:0;">Collaboration Network</h2>
              <p style="font-size:0.72rem;color:#94a3b8;margin:3px 0 0;" id="collab-subtitle">Loading from OpenAlex…</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:0.68rem;color:#94a3b8;">Click a node to open profile</span>
              <button id="close-collab-modal" title="Close"
                style="width:32px;height:32px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;font-size:1rem;color:#64748b;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
            </div>
          </div>
          <div id="collab-graph-container" style="flex:1;overflow:hidden;position:relative;background:#f8fafc;">
            <p style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.8rem;color:#94a3b8;font-style:italic;white-space:nowrap;">Fetching data…</p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('close-collab-modal').addEventListener('click', closeModal);
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

  async function fetchGraphData() {
    if (graphDataCache) return graphDataCache;

    // 1. Resolve author
    const authorRes = await fetch(`https://api.openalex.org/authors?filter=orcid:${ORCID}`);
    if (!authorRes.ok) throw new Error('Author fetch failed');
    const authorData = await authorRes.json();
    if (!authorData.results?.length) throw new Error('Author not found');
    const author = authorData.results[0];
    const authorId = author.id;

    // 2. Fetch works
    const worksRes = await fetch(
      `https://api.openalex.org/works?filter=authorships.author.id:${encodeURIComponent(authorId)}&per_page=100&select=id,authorships`
    );
    if (!worksRes.ok) throw new Error('Works fetch failed');
    const worksData = await worksRes.json();

    // 3. Build co-author map
    const coauthorMap = {};
    worksData.results.forEach(work => {
      work.authorships.forEach(a => {
        if (a.author.id !== authorId) {
          const id = a.author.id;
          if (!coauthorMap[id]) coauthorMap[id] = { id, name: a.author.display_name, count: 0, orcid: null };
          coauthorMap[id].count++;
        }
      });
    });

    const topCoauthors = Object.values(coauthorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_COAUTHORS);

    // 4. Batch-fetch ORCIDs for top co-authors
    if (topCoauthors.length > 0) {
      const ids = topCoauthors.map(c => c.id.split('/').pop()).join('|');
      try {
        const coRes = await fetch(
          `https://api.openalex.org/authors?filter=id:${encodeURIComponent(ids)}&per_page=${MAX_COAUTHORS}&select=id,orcid`
        );
        if (coRes.ok) {
          const coData = await coRes.json();
          coData.results.forEach(a => {
            const match = topCoauthors.find(c => c.id === a.id);
            if (match) match.orcid = a.orcid || null;
          });
        }
      } catch (_) { /* orcid enrichment is best-effort */ }
    }

    // Assign a color index to each co-author
    topCoauthors.forEach((c, i) => { c.colorIdx = i; });

    graphDataCache = {
      author,
      authorId,
      nodes: [{ id: authorId, name: author.display_name, main: true, count: 0, orcid: ORCID, colorIdx: -1 }, ...topCoauthors],
      links: topCoauthors.map(c => ({ source: authorId, target: c.id, value: c.count })),
      totalWorks: worksData.meta?.count ?? worksData.results.length
    };
    return graphDataCache;
  }

  function renderGraph(graphData) {
    const container = document.getElementById('collab-graph-container');
    if (!container || typeof d3 === 'undefined') return;

    container.innerHTML = '';
    const w = container.offsetWidth || 1060;
    const h = container.offsetHeight || 560;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .style('background', '#f8fafc');

    const defs = svg.append('defs');
    defs.append('radialGradient').attr('id', 'main-node-grad')
      .selectAll('stop')
      .data([{ offset: '0%', color: '#14b8a6' }, { offset: '100%', color: '#0f766e' }])
      .join('stop').attr('offset', d => d.offset).attr('stop-color', d => d.color);

    const nodeColor = d => d.main ? 'url(#main-node-grad)' : NODE_COLORS[d.colorIdx % NODE_COLORS.length];
    const nodeRadius = d => d.main ? 22 : 9 + Math.min(d.count * 1.4, 13);

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(d => 95 + (6 - Math.min(d.value, 6)) * 10).strength(0.65))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius(d => nodeRadius(d) + 22));

    // Edge weight legend shading
    const linkEl = svg.append('g')
      .selectAll('line').data(graphData.links).join('line')
      .attr('stroke', d => {
        const src = d.source.colorIdx !== undefined ? NODE_COLORS[d.source.colorIdx % NODE_COLORS.length] : '#0f766e';
        return d.source.main ? '#0f766e' : src;
      })
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', d => 1 + Math.min(d.value, 8) * 0.35);

    const nodeGroup = svg.append('g').selectAll('g').data(graphData.nodes).join('g')
      .style('cursor', d => (d.orcid || !d.main) ? 'pointer' : 'default')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        // Ignore if user was dragging
        if (event.defaultPrevented) return;
        const url = d.orcid
          ? `https://orcid.org/${d.orcid}`
          : `${d.id}`; // OpenAlex URL
        window.open(url, '_blank', 'noopener');
      });

    // Node circle with subtle drop shadow
    nodeGroup.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', nodeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.main ? 3 : 2)
      .attr('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.18))');

    // Initials / count inside circle
    nodeGroup.filter(d => d.main).append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '8px').attr('font-weight', 'bold').attr('fill', '#fff')
      .attr('pointer-events', 'none').text('E.D.P.');

    nodeGroup.filter(d => !d.main).append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '7px').attr('fill', '#fff')
      .attr('pointer-events', 'none').text(d => d.count > 1 ? d.count : '');

    // Name labels below nodes
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 13)
      .attr('font-size', d => d.main ? '11px' : '9px')
      .attr('font-weight', d => d.main ? '700' : '500')
      .attr('fill', d => d.main ? '#0f172a' : '#334155')
      .attr('pointer-events', 'none')
      .text(d => {
        if (d.main) return d.name.split(' ').slice(-2).join(' ');
        const parts = d.name.trim().split(' ');
        return parts.length > 2 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : d.name;
      });

    // ORCID indicator dot for nodes with ORCID
    nodeGroup.filter(d => !d.main && d.orcid).append('circle')
      .attr('r', 3.5)
      .attr('cx', d => nodeRadius(d) - 3)
      .attr('cy', d => -nodeRadius(d) + 3)
      .attr('fill', '#a6ce39')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none');

    nodeGroup.append('title').text(d =>
      d.main
        ? `${d.name}\n${graphData.totalWorks} publications\nClick to open ORCID`
        : `${d.name}\n${d.count} shared paper${d.count !== 1 ? 's' : ''}\n${d.orcid ? 'Click to open ORCID' : 'Click to open OpenAlex profile'}`
    );

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    simulation.on('tick', () => {
      linkEl
        .attr('x1', d => clamp(d.source.x, 5, w - 5)).attr('y1', d => clamp(d.source.y, 5, h - 5))
        .attr('x2', d => clamp(d.target.x, 5, w - 5)).attr('y2', d => clamp(d.target.y, 5, h - 5));
      nodeGroup.attr('transform', d => `translate(${clamp(d.x, 28, w - 28)},${clamp(d.y, 28, h - 44)})`);
    });
  }

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
          if (c) c.innerHTML = '<p style="padding:24px;text-align:center;color:#94a3b8;font-style:italic;">Could not load collaboration data.</p>';
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
