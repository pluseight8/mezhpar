import { describe, expect, it } from 'vitest'
import { createDemoSnapshot, lessonsForDay, loadSnapshot, searchSnapshot, toggleAssignment, toggleReaction, type Snapshot } from './domain'

describe('Mezhpar local preview data', () => {
  it('shows only the selected weekday and matching week parity', () => {
    const snapshot = createDemoSnapshot()
    const evenWednesday = lessonsForDay(snapshot.lessons, 3, 'even')
    const oddWednesday = lessonsForDay(snapshot.lessons, 3, 'odd')
    expect(evenWednesday.map((lesson) => lesson.subject)).toContain('Медиакоммуникации')
    expect(oddWednesday.map((lesson) => lesson.subject)).not.toContain('Медиакоммуникации')
    expect(lessonsForDay(snapshot.lessons, 1, 'odd')).toHaveLength(2)
  })

  it('toggles task completion without mutating unrelated rows', () => {
    const assignments = createDemoSnapshot().assignments
    const updated = toggleAssignment(assignments, assignments[0].id)
    expect(updated[0].done).toBe(true)
    expect(assignments[0].done).toBe(false)
    expect(updated[1]).toEqual(assignments[1])
  })

  it('keeps reaction counts in sync when toggled twice', () => {
    const posts = createDemoSnapshot().posts
    const postId = posts[0].id
    const liked = toggleReaction(posts, postId)
    const unliked = toggleReaction(liked, postId)
    expect(liked[0].likes).toBe(posts[0].likes + 1)
    expect(liked[0].liked).toBe(true)
    expect(unliked[0]).toMatchObject({ likes: posts[0].likes, liked: false })
  })

  it('searches lessons, assignments, posts and materials in Russian', () => {
    const results = searchSnapshot(createDemoSnapshot(), 'основы рекламы')
    expect(results.lessons.length).toBeGreaterThan(0)
    expect(results.assignments.length).toBeGreaterThan(0)
    expect(results.materials.length).toBeGreaterThan(0)
    expect(results.posts).toHaveLength(0)
  })

  it('falls back safely when saved browser data is malformed', () => {
    const storage = { getItem: () => '{broken json' }
    expect(loadSnapshot(storage).version).toBe(1)
    expect(loadSnapshot({ getItem: () => JSON.stringify({ version: 1 }) }).lessons.length).toBeGreaterThan(0)
  })

  it('rejects partial snapshots instead of silently dropping product sections', () => {
    const partial = { version: 1, lessons: [] } as unknown as Snapshot
    const restored = loadSnapshot({ getItem: () => JSON.stringify(partial) })
    expect(restored.assignments.length).toBeGreaterThan(0)
    expect(restored.posts.length).toBeGreaterThan(0)
  })
})
