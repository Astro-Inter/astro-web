import { useMemo } from 'react'
import type { ChatBlock, KeyedChatItem } from '../types/chatBlocks'
import { keyChatItems, parseBlocks } from '../utils/chatBlocks'

export function useChatBlocks(value: unknown): KeyedChatItem<ChatBlock>[] | null {
  return useMemo(() => {
    const blocks = parseBlocks(value)
    return blocks ? keyChatItems(blocks) : null
  }, [value])
}
