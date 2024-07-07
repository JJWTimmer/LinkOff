'use strict'

// Main function
let mode = 'hide'
let oldReponse = {}

async function doIt(response) {
  // if (JSON.stringify(oldReponse) == JSON.stringify(response)) return

  const enabled = response['main-toggle']

  // checks if filter needs updating, used below
  function res(field, bool) {
    const changed =
      response[field] != oldReponse[field] ||
      response['gentle-mode'] != oldReponse['gentle-mode'] ||
      response['main-toggle'] != oldReponse['main-toggle']
    if (changed) console.log(`LinkOff: Toggling ${field} to ${response[field]}`)
    return changed && response[field] == bool
  }

  // Set Mode
  mode = response['gentle-mode'] ? 'dim' : 'hide'

  // Set wide mode
  if (res('wide-mode', true)) {
    enableWideMode()
  } else if (res('wide-mode', false)) {
    disableWideMode()
  }

  // Hide feed
  let keywords = getKeywords(response)
  if (enabled && res('hide-whole-feed', true)) {
    toggleFeed(true)
    hideOther('feeds')
    clearInterval(keywordInterval)
    resetBlockedPosts()
  } else if (
    enabled &&
    (res('hide-whole-feed', false) || keywords != oldKeywords)
  ) {
    toggleFeed(false)
    showOther('feeds')
    clearInterval(keywordInterval)
    resetBlockedPosts()
    blockByKeywords(keywords, response['disable-postcount-prompt'])
  }
  if (res('main-toggle', false)) {
    //Feed
    toggleFeed(false)
    showOther('feeds')
    clearInterval(keywordInterval)
    resetBlockedPosts()
    resetAllPosts()
  }

  //Toggle feed sorting order
  if (
    enabled &&
    res('sort-by-recent', true) &&
    (window.location.href == 'https://www.linkedin.com/feed/' ||
      window.location.href == 'https://www.linkedin.com/')
  )
    sortByRecent()

  // Hide LinkedIn learning prompts and ads
  if (enabled && res('hide-linkedin-learning', true)) {
    hideOther('learning-top-courses')
    hideOther('pv-course-recommendations')
  } else if (
    res('main-toggle', false) ||
    res('hide-linkedin-learning', false)
  ) {
    showOther('learning-top-courses')
    showOther('pv-course-recommendations')
  }

  // Hide ads across linkedin
  if (enabled && res('hide-advertisements', true)) {
    hideOther('ad-banner-container')
    hideOther('ad-banner-container artdeco-card')
    hideOther('ad-banner-container is-header-zone')
    hideOther('ads-container')
  } else if (res('main-toggle', false) || res('hide-advertisements', false)) {
    showOther('ad-banner-container')
    showOther('ad-banner-container artdeco-card')
    showOther('ad-banner-container is-header-zone')
    showOther('ads-container')
  }

  // Hide feed area community and follow panels
  if (enabled && res('hide-community-panel', true)) {
    hideOther('community-panel')
  } else if (res('main-toggle', false) || res('hide-community-panel', false)) {
    showOther('community-panel')
  }

  if (enabled && res('hide-follow-recommendations', true)) {
    hideOther('feed-follows-module')
  } else if (
    res('main-toggle', false) ||
    res('hide-follow-recommendations', false)
  ) {
    showOther('feed-follows-module')
  }

  // Hide account building prompts
  if (enabled && res('hide-account-building', true)) {
    hideOther('artdeco-card ember-view mt2')
    hideOther('artdeco-card mb4 overflow-hidden ember-view')
  } else if (res('main-toggle', false) || res('hide-account-building', false)) {
    showOther('artdeco-card ember-view mt2')
    showOther('artdeco-card mb4 overflow-hidden ember-view')
  }

  // Hide viewership s building prompts
  if (enabled && res('hide-account-building', true)) {
    hideOther('artdeco-card ember-view mt2')
    hideOther('artdeco-card mb4 overflow-hidden ember-view')
  } else if (res('main-toggle', false) || res('hide-account-building', false)) {
    showOther('artdeco-card ember-view mt2')
    showOther('artdeco-card mb4 overflow-hidden ember-view')
  }

  // Hide network building prompts
  if (enabled && res('hide-network-building', true)) {
    hideOther('mn-abi-form')
    hideOther('pv-profile-pymk__container artdeco-card')
  } else if (res('main-toggle', false) || res('hide-network-building', false)) {
    showOther('mn-abi-form')
    showOther('pv-profile-pymk__container artdeco-card')
  }

  // Hide premium upsell prompts
  if (enabled && res('hide-premium', true)) {
    hideOther('premium-upsell-link', false)
    hideOther('gp-promo-embedded-card-three__card')
  } else if (res('main-toggle', false) || res('hide-premium', false)) {
    showOther('premium-upsell-link')
    showOther('gp-promo-embedded-card-three__card')
  }

  // Hide news
  if (enabled && res('hide-news', true)) {
    hideOther('news-module')
  } else if (res('main-toggle', false) || res('hide-news', false)) {
    showOther('news-module')
  }

  oldReponse = response
}

function getStorageAndDoIt() {
  chrome.storage.local.get(null, doIt)
}

// Toggle feed

function doFilterThingy(shown, attempts) {
  return () => {
    let success = false
    if (
      document.getElementsByClassName('artdeco-dropdown') &&
      document.getElementsByClassName('artdeco-dropdown')[1] &&
      document.getElementsByClassName('artdeco-dropdown')[1]
        .nextElementSibling
    ) {
      if (shown) {
        document
          .getElementsByClassName('artdeco-dropdown')[1]
          .nextElementSibling.classList.add('hide')
      } else {
        document
          .getElementsByClassName('artdeco-dropdown')[1]
          .nextElementSibling.classList.remove('hide', 'dim')
      }
      success = true
    }
    attempts = attempts + 1
    return { success: success, attempts: attempts }
  }
}

function toggleFeed(shown) {
  let attempts = 0
  let success = false

  while (!success && attempts < 50) {
    let result = doFilterThingy(shown, attempts)
    success = result.success
    attempts = result.attempts
  }
}

// Toggle arbitrary element

async function hideOther(className, showIcon = true) {
  const elements = await waitForClassName(className)
  for (let el of elements) {
    el.classList.remove('hide', 'dim', 'showIcon')
    el.classList.add(mode, showIcon && 'showIcon')
  }
}

async function showOther(className) {
  const elements = await waitForClassName(className)
  for (let el of elements) el.classList.remove('hide', 'dim', 'showIcon')
}

// Block by keywords

let keywordInterval
let postCountPrompted = false
let oldKeywords = []
let runs = 0

function resetBlockedPosts() {
  console.log(`LinkOff: Reset blocked posts (${runs} runs)`)
  let posts = document.querySelectorAll(
    '[data-id*="urn:li:activity"][data-hidden=false], [data-id*="urn:li:aggregate"][data-hidden=false]',
  )

  posts.forEach((post) => {
    post.classList.remove('hide', 'dim', 'showIcon')
    delete post.dataset.hidden
  })
}

function resetAllPosts() {
  console.log(`LinkOff: Resetting all posts`)
  let posts = document.querySelectorAll(
    '[data-id*="urn:li:activity"][data-hidden=true], [data-id*="urn:li:aggregate"][data-hidden=true]',
  )

  posts.forEach((post) => {
    post.classList.remove('hide', 'dim', 'showIcon')
    delete post.dataset.hidden
  })
}

function getKeywords(res) {
  let keywords =
    res['feed-keywords'] == '' ? [] : res['feed-keywords'].split(',')
  if (res['hide-by-age'] !== 'disabled')
    keywords.push(
      { hour: 'h • ', day: 'd • ', week: 'w • ', month: 'mo • ' }[
        res['hide-by-age']
        ],
    )
  if (res['hide-polls']) keywords.push('poll')
  if (res['hide-videos'])
    keywords.push('id="vjs_video_', 'feed-shared-linkedin-video')
  if (res['hide-links']) keywords.push('https://lnkd.in/')
  if (res['hide-images']) keywords.push('class="feed-shared-image')
  if (res['hide-promoted']) keywords.push('Promoted')
  if (res['hide-shared']) keywords.push('feed-shared-mini-update-v2')
  if (res['hide-followed']) keywords.push('following')
  // if (res['hide-liked']) keywords.push('likes this', 'like this')
  if (res['hide-liked']) keywords.push('likes this')
  if (res['hide-other-reactions'])
    keywords.push(
      'loves this',
      'finds this insightful',
      'celebrates this',
      'is curious about this',
      'supports this',
      'finds this funny',
    )
  if (res['hide-commented-on']) keywords.push('commented on this')
  if (res['hide-by-people']) keywords.push('href="https://www.linkedin.com/in/')

  console.log('LinkOff: Current keywords are', keywords)
  return keywords
}

function blockByKeywords(keywords, disablePostCount) {
  if (oldKeywords.some((kw) => !keywords.includes(kw))) {
    resetAllPosts()
  }

  oldKeywords = keywords

  let posts

  if (keywords.length)
    keywordInterval = setInterval(() => {
      if (runs % 10 == 0) resetBlockedPosts()
      // Select posts which are not already hidden
      posts = document.querySelectorAll(
        '[data-id*="urn:li:activity"]:not([data-hidden]), [data-id*="urn:li:aggregate"]:not([data-hidden])',
      )

      console.log(`LinkOff: Found ${posts.length} unblocked posts`)

      // Filter only if there are enough posts to load more
      if (posts.length > 5 || mode == 'dim') {
        posts.forEach((post) => {
          let keywordIndex

          let companyPresent
          for (let headerBar of post.getElementsByClassName('update-components-header')) {
            companyPresent = companyPresent || (headerBar.innerHTML.indexOf('href="https://www.linkedin.com/company/') !== -1)
            if (companyPresent) {
              keywordIndex = 666
            }
          }
          for (let actor of post.getElementsByClassName('update-components-actor__meta-link')) {
            companyPresent = companyPresent || (actor.getAttribute('href').indexOf('https://www.linkedin.com/company/') !== -1)
            if (companyPresent) {
              keywordIndex = 666
            }
          }

          if (
            keywords.some((keyword, index) => {
              keywordIndex = index
              return post.innerHTML.indexOf(keyword) !== -1
            }) || companyPresent
          ) {
            post.classList.add(mode, 'showIcon')
            post.onclick = () => {
              post.classList.remove('hide', 'dim', 'showIcon')
              post.dataset.hidden = 'shown'
            }

            // Add attribute to track already hidden posts
            post.dataset.hidden = true
            console.log(
              `LinkOff: Blocked post ${post.getAttribute(
                'data-id',
              )} for keyword ${keywordIndex === 666 ? 'Company' : keywords[keywordIndex]}`,
            )
          } else {
            post.classList.remove('hide', 'dim', 'showIcon')
            post.dataset.hidden = false
          }
        })
      } else {
        if (!postCountPrompted && !disablePostCount) {
          postCountPrompted = true //Prompt only once when loading linkedin
          alert(
            'Scroll down to start blocking posts (LinkedIn needs at least 10 loaded to load new ones).\n\nTo disable this alert, toggle it under misc in LinkOff settings',
          )
        }
      }

      runs++
    }, 1000)
}

// Toggle sort by recent

async function sortByRecent() {
  const dropdownTrigger = (
    await waitForSelector('li-icon[aria-label="Sort order dropdown button"]')
  ).parentElement.parentElement
  const parent = dropdownTrigger.parentElement
  if (dropdownTrigger.textContent.includes('Top')) {
    dropdownTrigger.click()
    const recentOption = await waitForSelectorScoped(
      'ul > li:nth-child(2) > div',
      parent,
    )
    recentOption.click()
  }
}

// Wait for selector implementation

async function waitForSelectorScoped(selector, scope) {
  while (scope.querySelector(`:scope ${selector}`) === null) {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve)
    })
  }
  return scope.querySelector(`:scope ${selector}`)
}

async function waitForSelector(selector) {
  while (document.querySelector(selector) === null) {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve)
    })
  }
  return document.querySelector(selector)
}

async function waitForClassName(className) {
  while (!document.getElementsByClassName(className).length) {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve)
    })
  }
  return document.getElementsByClassName(className)
}

// Main functions

window.mobileCheck = function() {
  let check = false
  ;(function(a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a,
      ) ||
      // eslint-disable-next-line no-useless-escape
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
        a.substr(0, 4),
      )
    )
      check = true
  })(navigator.userAgent || navigator.vendor || window.opera)
  return check
}

// Wide mode toggler

let wideModeDiv

function enableWideMode() {
  wideModeDiv =
    document.getElementsByClassName(
      'scaffold-layout__inner scaffold-layout-container scaffold-layout-container--reflow',
    )[0] || wideModeDiv
  if (wideModeDiv) wideModeDiv.classList.add('wide-mode')
}

function disableWideMode() {
  if (wideModeDiv) wideModeDiv.classList.remove('wide-mode')
}

// Add message selection button
async function setupDeleteMessagesButton() {
  console.log('LinkOff: Waiting for Messages to load')
  await waitForClassName('msg-conversations-container__dropdown-container')
  const menuContainer = document.querySelector(
    '.msg-conversations-container__dropdown-container > div',
  )

  const observer = new MutationObserver(function() {
    const menu = menuContainer.querySelector('ul')

    if (!menu || menu.children.length > 3) return

    const selectMenuItem = document.createElement('div')

    selectMenuItem.classList.add(
      'artdeco-dropdown__item',
      'artdeco-dropdown__item--is-dropdown',
      'ember-view',
    )
    selectMenuItem.textContent = 'Select all for deletion (LinkOff)'

    selectMenuItem.onclick = function() {
      document
        .querySelector(
          '.msg-conversations-container__title-row button.artdeco-dropdown__trigger',
        )
        .click()
      selectMessagesForDeletion()
    }

    console.log('LinkOff: Adding "Select messages for deletion" button')

    menu.appendChild(selectMenuItem)
  })

  observer.observe(menuContainer, {
    attributes: false,
    childList: true,
    subtree: false,
    characterData: false,
  })
}

//Modified from https://gist.github.com/twhitacre/d4536183c22a2f5a8c7c427df04acc90
async function selectMessagesForDeletion() {
  const container = document.querySelector(
    '.msg-conversations-container__conversations-list',
  )

  if (!container) {
    alert(
      'No messages. Are you on the messaging page?\n\nIf not, please navigate to messaging using the LinkedIn navbar and then click the Select Messages for Deletion button again.',
    )
    return
  }

  async function loadAllMessages() {
    return await new Promise((resolve) => {
      let height = 0
      let attempts = 0
      if (container) {
        const interval = setInterval(() => {
          const { scrollHeight } = container
          if (scrollHeight > 20000) {
            clearInterval(interval)
            resolve()
          }
          if (scrollHeight === height) {
            if (attempts >= 3) {
              clearInterval(interval)
              resolve()
            } else {
              attempts++
            }
          }
          height = scrollHeight
          container.scrollTop = scrollHeight
        }, 1000)
      } else {
        alert('The page took too long to load. Please try again.')
      }
    })
  }

  await loadAllMessages()
  const labels = container.getElementsByTagName('label')
  for (let i = 0; i < labels.length; i++) {
    if (labels[i]) {
      labels[i].click()
    }
  }
  alert('Click the trash can icon at the top to delete all messages.')
}

function getAllButtons() {
  return document.querySelectorAll('button.is-following') || []
}

async function unfollowAll() {
  let buttons = getAllButtons()

  if (!buttons.length) console.log('LinkOff: Successfully unfollowed all')

  for (let button of buttons) {
    window.scrollTo(0, button.offsetTop - 260)
    button.click()

    await Promise.resolve()
  }

  console.log(
    `LinkOff: Unfollowing the following interests`,
    buttons.map(
      (b) =>
        b.parentElement.querySelector('.follows-recommendation-card__name')
          .innerText,
    ),
  )

  window.scrollTo(0, document.body.scrollHeight)
  await Promise.resolve()

  buttons = getAllButtons()
  if (buttons.length) unfollowAll()
}

// Actions listener

chrome.runtime.onMessage.addListener(async (req) => {
  if (req['unfollow-all']) {
    if (!window.location.href.includes('/feed/following/')) {
      alert(
        'No messages. Are you on the follows page (/feed/following)?\n\nIf not, please navigate to following using the LinkedIn navbar and then click the Unfollow All button again.',
      )
      return
    } else {
      await unfollowAll()
    }
  }
})

// Storage listener
chrome.storage.onChanged.addListener(() => {
  getStorageAndDoIt()
})

// -- Track url changes
// let lastUrl = window.location.href
// setInterval(() => {
//   if (window.location.href !== lastUrl) {
//     lastUrl = window.location.href
//     oldReponse = {}
//     getStorageAndDoIt()
//     if (window.location.href.includes('/messaging/'))
//       setupDeleteMessagesButton()
//   }
// }, 500)

function runOnLoad() {
  return () => {
    getStorageAndDoIt()
    if (window.location.href.includes('/messaging/'))
      setupDeleteMessagesButton()
  }
}

// -- On load
if (document.readyState !== 'loading') {
  runOnLoad()
} else {
  document.addEventListener('DOMContentLoaded', runOnLoad())
}
