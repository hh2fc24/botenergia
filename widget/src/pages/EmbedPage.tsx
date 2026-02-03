import { useEffect } from 'react'
import { readWidgetConfig } from '../lib/config'
import ChatWidget from '../widget/ChatWidget'

export default function EmbedPage() {
  const config = readWidgetConfig()

  useEffect(() => {
    document.documentElement.dataset.ebTheme = config.theme
  }, [config.theme])

  return <ChatWidget config={config} />
}

