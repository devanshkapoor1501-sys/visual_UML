import { type Diagram, type Project, type UmlElement } from '../../shared/model';

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] ?? character));
}

function elementMarkup(element: UmlElement, x: number, y: number, width: number, height: number): string {
  const name = escapeXml(element.name);
  const stereotype = element.properties.stereotype ? `&lt;&lt;${escapeXml(String(element.properties.stereotype))}&gt;&gt;` : '';
  if (element.kind === 'actor') return `<g transform="translate(${x} ${y})"><circle cx="${width / 2}" cy="18" r="10" fill="none" stroke="#334155"/><path d="M${width / 2} 28v32m0-24-22 16m22-16 22 16m-22 8-16 28m16-28 16 28" fill="none" stroke="#334155" stroke-width="2"/><text x="${width / 2}" y="${height - 6}" text-anchor="middle" class="label">${name}</text></g>`;
  if (element.kind === 'use-case') return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#fff" stroke="#334155" stroke-width="2"/><text x="${x + width / 2}" y="${y + height / 2 + 5}" text-anchor="middle" class="label">${name}</text>`;
  if (element.kind === 'initial') return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="16" fill="#1e293b"/>`;
  if (element.kind === 'final') return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="16" fill="#fff" stroke="#1e293b" stroke-width="3"/><circle cx="${x + width / 2}" cy="${y + height / 2}" r="9" fill="#1e293b"/>`;
  if (element.kind === 'decision') return `<path d="M${x + width / 2} ${y + 4} L${x + width - 4} ${y + height / 2} L${x + width / 2} ${y + height - 4} L${x + 4} ${y + height / 2} Z" fill="#fff" stroke="#334155" stroke-width="2"/><text x="${x + width / 2}" y="${y + height / 2 + 5}" text-anchor="middle" class="tiny-label">${name}</text>`;
  if (element.kind === 'note') return `<path d="M${x} ${y} h${width - 18} l18 18 v${height - 18} h-${width} z" fill="#fff9c4" stroke="#a16207"/><path d="M${x + width - 18} ${y} v18 h18" fill="none" stroke="#a16207"/><text x="${x + 10}" y="${y + 28}" class="label">${escapeXml(String(element.properties.text || name))}</text>`;
  if (element.kind === 'lifeline') return `<g><rect x="${x}" y="${y}" width="${width}" height="36" rx="4" fill="#fff" stroke="#334155"/><text x="${x + width / 2}" y="${y + 23}" text-anchor="middle" class="label">${name}</text><path d="M${x + width / 2} ${y + 36} V${y + height}" stroke="#64748b" stroke-dasharray="7 5"/></g>`;
  const attributes = element.properties.attributes ?? [];
  const operations = element.properties.operations ?? [];
  const divider1 = y + 42;
  const divider2 = divider1 + Math.max(30, attributes.length * 18 + 12);
  const lines = [...attributes, ...operations];
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" fill="#fff" stroke="#334155" stroke-width="2"/><text x="${x + width / 2}" y="${y + 17}" text-anchor="middle" class="stereotype">${stereotype}</text><text x="${x + width / 2}" y="${y + 34}" text-anchor="middle" class="title">${name}</text>${element.kind === 'class' || element.kind === 'interface' || element.kind === 'object' ? `<path d="M${x} ${divider1} H${x + width} M${x} ${divider2} H${x + width}" stroke="#cbd5e1"/>` : ''}${lines.map((line, index) => `<text x="${x + 10}" y="${y + 58 + index * 18}" class="label">${escapeXml(line)}</text>`).join('')}</g>`;
}

export function buildDiagramSvg(project: Project, diagram: Diagram): string {
  const padding = 80;
  const maxX = Math.max(900, ...diagram.views.map((view) => view.x + view.width + padding));
  const maxY = Math.max(650, ...diagram.views.map((view) => view.y + view.height + padding));
  const views = new Map(diagram.views.map((view) => [view.elementId, view]));
  const edges = diagram.relationships.map((relationship) => {
    const source = views.get(relationship.sourceId);
    const target = views.get(relationship.targetId);
    if (!source || !target) return '';
    const x1 = source.x + source.width / 2;
    const y1 = source.y + source.height / 2;
    const x2 = target.x + target.width / 2;
    const y2 = target.y + target.height / 2;
    const marker = ['dependency', 'generalization', 'realization', 'message', 'control-flow', 'transition'].includes(relationship.kind) ? ' marker-end="url(#arrow)"' : '';
    const dash = ['dependency', 'include', 'extend'].includes(relationship.kind) ? ' stroke-dasharray="7 5"' : '';
    const label = relationship.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" class="label" text-anchor="middle">${escapeXml(relationship.label)}</text>` : '';
    return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="#50627a" stroke-width="2"${dash}${marker}/>${label}`;
  }).join('');
  const elements = diagram.views.map((view) => {
    const element = project.model.elements[view.elementId];
    return element ? elementMarkup(element, view.x, view.y, view.width, view.height) : '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#50627a"/></marker></defs><style>.label{font:14px Inter,Arial,sans-serif;fill:#334155}.title{font:bold 14px Inter,Arial,sans-serif;fill:#0f172a}.stereotype{font:11px Inter,Arial,sans-serif;fill:#64748b}.tiny-label{font:10px Inter,Arial,sans-serif;fill:#334155}</style><rect width="100%" height="100%" fill="#ffffff"/>${edges}${elements}</svg>`;
}

export function downloadText(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

export function downloadDataUrl(fileName: string, dataUrl: string) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 0);
}
