import assert from 'node:assert/strict'
import { stripTrackingParams } from '../src/main/blocker/url-cleaner'
import { TRACKING_PARAMS } from '../src/main/blocker/constants'
import { hostMatches, hrefsMatch, isPopunderHost, isYouTubeHost, registrableDomain } from '../src/main/blocker/util'

assert.ok(TRACKING_PARAMS.size >= 30, 'need 30+ tracking params')
assert.equal(stripTrackingParams('https://a.com/p?utm_source=x&id=5&fbclid=y'), 'https://a.com/p?id=5')
assert.equal(stripTrackingParams('https://a.com/p?UTM_Source=X'), 'https://a.com/p')
assert.equal(stripTrackingParams('https://a.com/p?id=5'), null)
assert.equal(stripTrackingParams('mailto:a@b.com?utm_source=x'), null)
assert.equal(stripTrackingParams('https://a.com/?gclid=1&msclkid=2&yclid=3&mc_eid=4'), 'https://a.com/')

assert.ok(isPopunderHost('ads.adsterra.com'))
assert.ok(isPopunderHost('syndication.exoclick.com'))
assert.ok(isPopunderHost('1xbet.com'))
assert.ok(isPopunderHost('1xlite-123456.top'))
assert.ok(!isPopunderHost('adsterra.com.evil.io'))
assert.ok(!isPopunderHost('notadsterra.com'))

assert.ok(isYouTubeHost('rr3---sn-abc.googlevideo.com'))
assert.ok(isYouTubeHost('m.youtube.com'))
assert.ok(!isYouTubeHost('youtube.com.evil.com'))
assert.ok(!isYouTubeHost('notyoutube.com'))

assert.equal(registrableDomain('a.b.example.co.uk'), 'example.co.uk')
assert.ok(hrefsMatch('https://a.com/x/?y=1', 'https://a.com/x'))
assert.ok(hostMatches('cdn.taboola.com', ['taboola.com']))

console.log('verify-shields: ALL CHECKS PASSED')
