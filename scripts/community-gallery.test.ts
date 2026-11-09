import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { communityStories, getCommunityStories, getFeaturedStories, storyCategories } from '../src/data/community-stories'

const supplied=['19iGSkMjPs','1E7aKMC3in','1ECQTNSobf','1JYYAeBnqN','152iTKT4sEf','1MgUphpjy9','19rJEV47Y7','1FpWfkyYWH','19tQdDhQ4u','1FhqMV6qMM','1FrHLWzKJv','19yRNQR8Fi','1WgeK7v9MQ','19ogHFTwb3','17vgjtJhkv','1dRzE2WcCd','1E6Qg3dNMU']
test('every supplied community post is represented once with a source',()=>{
  assert.equal(communityStories.length,19)
  assert.equal(new Set(communityStories.map(story=>story.id)).size,19)
  for(const id of supplied) assert.equal(communityStories.filter(story=>story.sources.some(source=>source.url==='https://www.facebook.com/share/p/'+id+'/')).length,1,id)
})
test('galleries contain valid local images and no repeated slide within a story',()=>{
  let total=0
  for(const story of communityStories){
    assert.ok(storyCategories.includes(story.category))
    assert.ok(story.images.length>0)
    const hashes=[]
    for(const image of story.images){
      const file=resolve('public','.'+image.src)
      assert.ok(file.startsWith(resolve('public')+sep))
      assert.ok(existsSync(file),image.src)
      hashes.push(createHash('sha256').update(readFileSync(file)).digest('hex'))
      assert.ok(image.credit&&image.alt)
      assert.equal(new URL(image.sourceUrl).protocol,'https:')
      total++
    }
    assert.equal(new Set(hashes).size,hashes.length,story.id)
  }
  assert.equal(total,50)
})
test('Meetup records are linked to their existing stories without duplicate workshop cards',()=>{
  const stories=getCommunityStories()
  assert.equal(stories.length,19)
  for(const id of ['314574481','314670850','313845567','313249800']) assert.equal(stories.filter(story=>story.meetupIds.includes(id)).length,1)
  assert.ok(stories.find(story=>story.id==='student-community-day-2026')?.meetupLinks.some(link=>link.url.endsWith('/316720779/')))
  assert.ok(stories.find(story=>story.id==='codekada-2026')?.meetupLinks.some(link=>link.url==='https://www.meetup.com/devkada/events/313943187/'))
})
test('featured selection includes chapter work, partners, member wins and learning access',()=>{
  const featured=getFeaturedStories()
  assert.equal(featured.length,6)
  for(const category of storyCategories) assert.ok(featured.some(story=>story.category===category))
  assert.equal(communityStories.find(story=>story.id==='ygg-play-summit-2025')?.role,'Community partner')
  assert.equal(communityStories.filter(story=>story.category==='Achievements').length,5)
})
test('original source, video and Meetup links use HTTPS',()=>{
  for(const story of communityStories){
    for(const link of [...story.sources,...story.meetupLinks]) assert.equal(new URL(link.url).protocol,'https:')
    if(story.videoUrl) assert.equal(new URL(story.videoUrl).protocol,'https:')
  }
})
