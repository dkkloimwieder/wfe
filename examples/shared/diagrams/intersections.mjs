export function diagramIntersections(root) {
  return root.evaluate((element) => {
    const nodes = Array.from(
      element.querySelectorAll('[data-diagram-node]'),
      (node) => ({
        id: node.dataset.diagramNode,
        name: node.querySelector('.ui-diagram-node-title').textContent,
        box: node.getBoundingClientRect(),
      }),
    )
    const paths = []
    const labels = []
    for (const edge of element.querySelectorAll('[data-diagram-edge]')) {
      const [from, to] = edge.getAttribute('aria-label').split(' → ')
      const unrelated = nodes.filter(
        ({ name }) =>
          from !== name &&
          !from.startsWith(name + ' / ') &&
          !to.startsWith(name + ': ') &&
          !to.startsWith(name + ' / '),
      )
      const path = edge.querySelector('.ui-diagram-edge-line')
      const matrix = path.getScreenCTM()
      const length = path.getTotalLength()
      const steps = Math.max(1, Math.ceil(length / 2))
      const hit = new Set()
      for (let i = 0; i <= steps; i++) {
        const point = DOMPoint.fromPoint(
          path.getPointAtLength((length * i) / steps),
        ).matrixTransform(matrix)
        for (const { id, box } of unrelated) {
          // The inset excludes subpixel rounding at node boundaries.
          if (
            point.x > box.left + 0.25 &&
            point.x < box.right - 0.25 &&
            point.y > box.top + 0.25 &&
            point.y < box.bottom - 0.25
          )
            hit.add(id)
        }
      }
      const id = edge.dataset.diagramEdge
      for (const node of hit) paths.push([id, node])
      const label = edge
        .querySelector('.ui-diagram-edge-label-background')
        ?.getBoundingClientRect()
      if (label)
        for (const { id: node, box } of nodes)
          if (
            label.left < box.right &&
            label.right > box.left &&
            label.top < box.bottom &&
            label.bottom > box.top
          )
            labels.push([id, node])
    }
    return { paths, labels }
  })
}
