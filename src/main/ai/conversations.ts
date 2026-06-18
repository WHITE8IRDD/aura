import { getDb } from '../db'

export interface Conversation {
  id: number
  title: string
  pageUrl: string | null
  pageTitle: string | null
  createdAt: number
  updatedAt: number
}

export interface ConversationMessage {
  id: number
  conversationId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export function createConversation(
  title: string,
  pageUrl: string | null,
  pageTitle: string | null
): Conversation {
  const db = getDb()
  const now = Date.now()
  const info = db.prepare(
    `INSERT INTO ai_conversations (title, page_url, page_title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(title, pageUrl, pageTitle, now, now)
  return {
    id: info.lastInsertRowid as number,
    title, pageUrl, pageTitle,
    createdAt: now, updatedAt: now
  }
}

export function addMessage(
  conversationId: number,
  role: ConversationMessage['role'],
  content: string
): ConversationMessage {
  const db = getDb()
  const now = Date.now()
  const info = db.prepare(
    `INSERT INTO ai_messages (conversation_id, role, content, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(conversationId, role, content, now)
  db.prepare(`UPDATE ai_conversations SET updated_at = ? WHERE id = ?`)
    .run(now, conversationId)
  return {
    id: info.lastInsertRowid as number,
    conversationId, role, content, createdAt: now
  }
}

export function listConversations(limit = 50): Conversation[] {
  return getDb().prepare(
    `SELECT id, title, page_url AS pageUrl, page_title AS pageTitle,
            created_at AS createdAt, updated_at AS updatedAt
     FROM ai_conversations ORDER BY updated_at DESC LIMIT ?`
  ).all(limit) as Conversation[]
}

export function getMessages(conversationId: number): ConversationMessage[] {
  return getDb().prepare(
    `SELECT id, conversation_id AS conversationId, role, content,
            created_at AS createdAt
     FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC`
  ).all(conversationId) as ConversationMessage[]
}

export function deleteConversation(id: number): void {
  const db = getDb()
  db.transaction(() => {
    db.prepare(`DELETE FROM ai_messages WHERE conversation_id = ?`).run(id)
    db.prepare(`DELETE FROM ai_conversations WHERE id = ?`).run(id)
  })()
}

export function renameConversation(id: number, title: string): void {
  getDb().prepare(`UPDATE ai_conversations SET title = ? WHERE id = ?`).run(title, id)
}
