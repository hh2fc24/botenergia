export type Theme = 'light' | 'dark'

export type WidgetConfig = {
  pageUrl: string | null
  theme: Theme
  open: boolean
}

export function readWidgetConfig(): WidgetConfig {
  const params = new URLSearchParams(window.location.search)
  const pageUrlParam = params.get('pageUrl')
  const themeParam = params.get('theme')
  const openParam = params.get('open')

  const isInIframe = (() => {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  })()

  const pageUrl =
    (pageUrlParam && safeDecodeURIComponent(pageUrlParam)) ||
    document.referrer ||
    null

  const theme: Theme = themeParam === 'dark' ? 'dark' : 'light'

  return {
    pageUrl,
    theme,
    open: openParam === '1' || (openParam !== '0' && isInIframe),
  }
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

