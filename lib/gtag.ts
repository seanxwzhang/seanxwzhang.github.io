// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
declare global {
  interface Window {
    gtag: any;
  }
}

export const pageview = (gTag: string, url: string) => {
  window.gtag('config', gTag, {
    page_path: url
  })
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: { action: string, category: string, label: string, value: number }) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}
