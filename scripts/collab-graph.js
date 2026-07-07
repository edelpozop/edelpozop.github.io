async function loadCollaborationGraph() {
  const container = document.getElementById('collab-graph');
  if (!container || typeof d3 === 'undefined') return;

  const orcid = '0000-0001-8679-6975';

  try {
    // 1. Resolve author ID from ORCID via OpenAlex
    const authorRes = await fetch(`https://api.openalex.org/authors?filter=orcid:${orcid}`);
    if (!authorRes.ok) throw new Error('OpenAlex author fetch failed');
    const authorData = await authorRes.json();

    if (!authorData.results || authorData.results.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 italic p-3 text-center">No data available</p>';
      return;
    }

    const author = authorData.results[0];
    const authorOpenAlexId = author.id;

    // 2. Fetch works (select minimal fields to keep response small)
    const worksRes = await fetch(
      `https://api.openalex.org/works?filter=authorships.author.id:${encodeURIComponent(authorOpenAlexId)}&per_page=100&select=id,authorships`
    );
    if (!worksRes.ok) throw new Error('OpenAlex works fetch failed');
    const worksData = await worksRes.json();

    // 3. Build co-author map
    const coauthorMap = {};
    worksData.results.forEach(work => {
      work.authorships.forEach(a => {
        if (a.author.id !== authorOpenAlexId) {
          const id = a.author.id;
          if (!coauthorMap[id]) coauthorMap[id] = { id, name: a.author.display_name, count: 0 };
          coauthorMap[id].count++;
        }
      });
    });

    const topCoauthors = Object.values(coauthorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 14);

    if (topCoauthors.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 italic p-3 text-center">No collaboration data found</p>';
      return;
    }

    const nodes = [
      { id: authorOpenAlexId, name: author.display_name, main: true, count: 0 },
      ...topCoauthors
    ];
    const links = topCoauthors.map(c => ({
      source: authorOpenAlexId,
      target: c.id,
      value: c.count
    }));

    // 4. Render force-directed graph with D3
    container.innerHTML = '';
    const w = container.offsetWidth || 260;
    const h = 210;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', h)
      .attr('viewBox', `0 0 ${w} ${h}`)
      .style('background', '#f8fafc')
      .style('border-radius', '8px');

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(52).strength(0.9))
      .force('charge', d3.forceManyBody().strength(-90))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius(d => d.main ? 20 : 12));

    const linkEl = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', d => 0.8 + Math.min(d.value, 6) * 0.35);

    const nodeEl = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.main ? 14 : 5 + Math.min(d.count * 1.5, 8))
      .attr('fill', d => d.main ? '#0f766e' : '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    nodeEl.append('title')
      .text(d => d.main ? d.name : `${d.name} (${d.count} shared paper${d.count !== 1 ? 's' : ''})`);

    // Label on main node
    const labelEl = svg.append('g')
      .selectAll('text')
      .data(nodes.filter(d => d.main))
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '5.5px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text('E.D.P.');

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    simulation.on('tick', () => {
      linkEl
        .attr('x1', d => clamp(d.source.x, 5, w - 5))
        .attr('y1', d => clamp(d.source.y, 5, h - 5))
        .attr('x2', d => clamp(d.target.x, 5, w - 5))
        .attr('y2', d => clamp(d.target.y, 5, h - 5));
      nodeEl
        .attr('cx', d => clamp(d.x, 16, w - 16))
        .attr('cy', d => clamp(d.y, 16, h - 16));
      labelEl
        .attr('x', d => clamp(d.x, 16, w - 16))
        .attr('y', d => clamp(d.y, 16, h - 16));
    });

  } catch (e) {
    console.error('Error loading collaboration graph:', e);
    container.innerHTML = '<p class="text-xs text-gray-400 italic p-3 text-center">Graph unavailable</p>';
  }
}

// Wait for the links section to render the graph container, then load
document.addEventListener('DOMContentLoaded', () => {
  // collab-graph div is injected by loadLinks() in sections-loader.js
  // We observe the DOM for it to appear
  const observer = new MutationObserver(() => {
    const graphEl = document.getElementById('collab-graph');
    if (graphEl) {
      observer.disconnect();
      loadCollaborationGraph();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
