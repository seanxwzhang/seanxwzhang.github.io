import { idToUuid } from 'notion-utils'
export default function getAllPageIds (collectionQuery, viewId = null) {
  const views = Object.values(collectionQuery)[0] as [any]
  let pageIds: string[] = [] // Explicitly type pageIds as an array of string type
  if (viewId) {
    const vId = idToUuid(viewId)
    pageIds = views[vId]?.blockIds
  } else {
    const pageSet: Set<string> = new Set()
    Object.values(views).forEach(view => {
      view.collection_group_results?.blockIds?.forEach(id => pageSet.add(id))
    })
    pageIds = Array.from(pageSet) // Convert pageSet to an array
  }
  return pageIds
}
