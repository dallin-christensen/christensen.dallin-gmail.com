const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: false })
const vo = require('vo');
const numeral = require('numeral');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

const queryBy = 'div.v1Nh3 a'
const followersSpan = 'a.-nal3 span.g47SY'
const likes = []
let followers


const calculateIgScore = () => {
  let totalLikes = numeral()

  likes.forEach((like) => totalLikes.add(like.value()))

  const numberOfPosts = numeral(likes.length)
  const avgLikes = totalLikes.divide(numberOfPosts.value())
  const igPercentage = avgLikes.divide(followers.value()).multiply(100)
  const igScore = `${igPercentage.value().toFixed(2)}%`

  return igScore
}

const getLikesFromPostPage = () => {
  const elements = document.querySelectorAll('button')
  const selectedAnchor = Array.prototype.filter.call(elements, (element) => RegExp('likes').test(element.textContent));

  const selectedSpan = selectedAnchor && selectedAnchor[0] && selectedAnchor[0].querySelector && selectedAnchor[0].querySelector('span')
  const selectedSpanInnerText = selectedSpan && selectedSpan.innerText

  return selectedSpanInnerText
}

const isPrivatePage = () => {
  const elements = document.querySelectorAll('h2')
  const privateh2s = Array.prototype.filter.call(elements, (element) => RegExp('This Account is Private').test(element.textContent));

  return privateh2s.length
}

const isUserValid = () => {
  const elements = document.querySelectorAll('h2')
  const unavailableh2s = Array.prototype.filter.call(elements, (element) => RegExp('Sorry, this page isn\'t available.').test(element.textContent));

  return !unavailableh2s.length
}

function * initialInstaPageScrape (username) {

  console.log('scraping page...')

  const doesPageExist = yield nightmare
    .goto(`https://www.instagram.com/${username}/`)
    .evaluate(isUserValid)

  if (!doesPageExist) {
    yield nightmare.end()
    return { success: false, value: 'invalid account name.' }
  }

  followers = yield nightmare
    .evaluate(selector => document.querySelectorAll(selector)[1].innerText, followersSpan)
    .then(followersTextVal => numeral(followersTextVal))
    .catch(error => console.error('search for followers failed:', error))


  const links = yield nightmare
    .evaluate((selector) => Array.from(document.querySelectorAll(selector)).map(element => element.href), queryBy)
    .catch(error => console.error('Search for post links failed:', error))

  if (!links.length) {
    let private

    yield nightmare
      .evaluate(isPrivatePage)
      .end()
      .then((pageIsPrivate) => (private = pageIsPrivate))


    if (private) {
      return { success: false, value: 'private account.' }
    } else {
      return { success: false, value: 'account has no posts.' }
    }
  }

  const iterationAmount = links.length > 12 ? 12 : links.length

  for (var i = 0; i < iterationAmount; i++) {
    console.log(`scraping post ${i+1}...`)
    yield nightmare
      .goto(links[i])
      .evaluate(getLikesFromPostPage)
      .then((likeCount) => likeCount && likes.push(numeral(likeCount)))
      .catch(error => console.error('scraping likes from posts failed:', error))
  }

  yield nightmare.end()

  if (!likes.length) {
    return { success: false, value: 'this account has no likes displayed in their latest 12 posts' }
  }

  return { success: true, value: calculateIgScore() }
}


readline.question(`instagram account: `, (username) => {
  vo(initialInstaPageScrape(username))(function(err, result) {
    if (err) throw err;

    if (result.success) {
      console.log('final ig score: ' + result.value)
    } else {
      console.log(result.value)
    }

    readline.close()
  });
})

// rename functions
// enter in account from terminal
// git init
// limit to 12
// error handling every failure point
// react ui
// set up linter
// set up sentry
// set up google analytics