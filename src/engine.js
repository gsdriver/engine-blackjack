/*!
 engine-blackjack
 Copyright (C) 2016 Marco Casula

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along
 with this program; if not, write to the Free Software Foundation, Inc.,
 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

const cardName = (number) => {
  if (!number) {
    return null
  }
  switch (number) {
    case 1: {
      return 'A'
    }
    case 11: {
      return 'J'
    }
    case 12: {
      return 'Q'
    }
    case 13: {
      return 'K'
    }
    default: {
      return number.toString()
    }
  }
}

const suiteName = (suite) => {
  switch (suite.toLowerCase()) {
    case '♥':
    case 'h':
    case 'heart':
    case 'hearts': {
      return 'hearts'
    }
    case '♦':
    case 'd':
    case 'diamond':
    case 'diamonds': {
      return 'diamonds'
    }
    case '♣':
    case 'c':
    case 'club':
    case 'clubs': {
      return 'clubs'
    }
    case '♠':
    case 's':
    case 'spade':
    case 'spades': {
      return 'spades'
    }
    default: {
      return null
    }
  }
}

const suiteColor = (suite) => {
  switch (suite) {
    case 'hearts':
      return 'R'
    case 'diamonds':
      return 'R'
    case 'clubs':
      return 'B'
    case 'spades':
      return 'B'
    default:
      return null
  }
}

const cardValue = (number) => number < 10 ? number : 10

const makeCard = (number, suite) => {
  const _suite = suiteName(suite)
  return {
    text: cardName(number),
    suite: _suite,
    value: cardValue(number),
    color: suiteColor(_suite)
  }
}

const newDecks = (n) => {
  let cards = []
  for(let i = 0; i < n; i++){
    cards = newDeck().concat(cards)
  }
  return cards
}

const newDeck = () => {
  return [].concat.apply([],
    [ 'hearts', 'diamonds', 'clubs', 'spades' ]
      .map(suite => {
        return [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ]
          .map(number => makeCard(number, suite))
      })
  )
}

const shuffle = (original) => {
  let array = original.slice(0)
  let currentIndex = array.length, temporaryValue, randomIndex
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}

const calculate = (array) => {
  if (array.length === 1) {
    if (!array[0]) {
      return null
    }
    const value = array[0].value
    return {
      hi: value === 1 ? 11 : value,
      lo: value === 1 ? 1 : value
    }
  }
  const aces = []
  const value = array.reduce((memo, x) => {
    if (x.value === 1) {
      aces.push(1)
      return memo
    }
    memo += x.value
    return memo
  }, 0)
  return aces.reduce((memo, x) => {
    if ((memo.hi + 11) <= 21) {
      memo.hi += 11
      memo.lo += 1
    } else {
      memo.hi += 1
      memo.lo += 1
    }
    return memo
  }, {
    hi: value,
    lo: value
  })
}

const isBlackjack = (array) => array.length === 2 && calculate(array).hi === 21

const serializeCard = (value) => {
  const digits = value.match(/\d/g)
  let number = null
  let figure = null
  let suite = null
  if (digits && digits.length > 0) {
    number = Number(digits.join(''))
    suite = value.replace(number, '')
  } else {
    ['j', 'q', 'k'].forEach((x, i) => {
      if (value.indexOf(x) || value.indexOf(x.toUpperCase())) {
        number = 11 + i
        figure = x
        suite = value
          .replace(figure, '')
          .replace(figure.toUpperCase(), '')
      }
    })
  }
  suite = suite.replace('-', '')
  return makeCard(number, suite)
}

const serializeCards = (value) => {
  return value.split(' ').map(serializeCard)
}

const countCards = (array) => {
  const systems = {
    'Hi-Lo': [-1, 1, 1, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1 ]
  }
  return array.reduce((memo, x) => {
    memo += systems['Hi-Lo'][x.value - 1]
    return memo
  }, 0)
}

const getHandInfo = (playerCards, dealerCards) => {
  const handValue = calculate(playerCards)
  if (!handValue) {
    return null
  }
  const hasBlackjack = isBlackjack(playerCards)
  const hasBusted = handValue.hi > 21
  const isClosed = hasBusted || hasBlackjack
  const canDoubleDown = !isClosed
  const canSplit = playerCards.length > 1 && playerCards[ 0 ].value === playerCards[ 1 ].value && !isClosed
  const canEnsure = dealerCards[ 0 ].value === 1
  return {
    cards: playerCards,
    playerValue: handValue,
    playerHasBlackjack: hasBlackjack,
    playerHasBusted: hasBusted,
    playerHasSurrendered: false,
    playerInsuranceValue: 0,
    close: isClosed,
    availableActions: {
      double: canDoubleDown,
      split: canSplit,
      insurance: canEnsure,
      noinsurance: canEnsure,
      hit: !isClosed,
      stand: !isClosed,
      surrender: !isClosed
    }
  }
}

const getHandInfoAfterDeal = (playerCards, dealerCards, initialBet) => {
  const hand = getHandInfo(playerCards, dealerCards)
  hand.bet = initialBet
  // After deal, even if we got a blackjack the hand cannot be considered closed.
  const availableActions = hand.availableActions
  hand.availableActions = Object.assign(availableActions, {
    stand: true,
    hit: true,
    surrender: true
  })
  return Object.assign(hand, {close: (hand.playerHasBlackjack && (dealerCards[0].value != 1)) ? true : false})
}

const getHandInfoAfterSplit = (playerCards, dealerCards, initialBet) => {
  const hand = getHandInfo(playerCards, dealerCards)
  const availableActions = hand.availableActions
  hand.availableActions = Object.assign(availableActions, {
    stand: false,
    split: false,
    double: false,
    insurance: false,
    noinsurance: false,
    surrender: false
  })
  hand.bet = initialBet
  return hand
}

const getHandInfoAfterHit = (playerCards, dealerCards, initialBet) => {
  const hand = getHandInfo(playerCards, dealerCards)
  const availableActions = hand.availableActions
  hand.availableActions = Object.assign(availableActions, {
    double: (playerCards.length == 2),
    split: false,
    insurance: false,
    noinsurance: false,
    surrender: false
  })
  hand.bet = initialBet
  return hand
}

const getHandInfoAfterDouble = (playerCards, dealerCards, initialBet) => {
  const hand = getHandInfoAfterHit(playerCards, dealerCards)
  const availableActions = hand.availableActions
  hand.availableActions = Object.assign(availableActions, {
    hit: false,
    stand: false
  })
  hand.bet = initialBet * 2
  return Object.assign(hand, {close: true})
}

const getHandInfoAfterStand = (handInfo) => {
  return Object.assign(handInfo, {
    close: true,
    availableActions: {
      double: false,
      split: false,
      insurance: false,
      noinsurance: false,
      hit: false,
      stand: false,
      surrender: false
    }
  })
}

const getHandInfoAfterSurrender = (handInfo) => {
  const hand = getHandInfoAfterStand(handInfo)
  return Object.assign(hand, {
    playerHasSurrendered: true,
    close: true
  })
}

const getHandInfoAfterInsurance = (playerCards, dealerCards, bet) => {
  const hand = getHandInfo(playerCards, dealerCards)
  const availableActions = hand.availableActions
  availableActions.insurance = false
  availableActions.noinsurance = false
  return Object.assign(hand, { playerInsuranceValue: bet, availableActions: availableActions })
}

const isLuckyLucky = (playerCards, dealerCards) => {
  // Player hand and dealer's up card sum to 19, 20, or 21 ("Lucky Lucky")
  const value = calculate(playerCards).hi + calculate(dealerCards).hi
  return value >= 19 && value <= 21
}

const isPerfectPairs = (playerCards) => playerCards[0].value === playerCards[1].value

const getSideBetsInfo = (availableBets, sideBets, playerCards, dealerCards) => {
  const sideBetsInfo = {
    luckyLucky: 0,
    perfectPairs: 0
  }
  if (availableBets.luckyLucky && sideBets.luckyLucky && isLuckyLucky(playerCards, dealerCards)) {
    sideBetsInfo.luckyLucky = sideBets.luckyLucky * 2
  }
  if (availableBets.perfectPairs && sideBets.perfectPairs && isPerfectPairs(playerCards)) {
    // TODO: impl colored pairs
    // TODO: impl mixed pairs
    sideBetsInfo.perfectPairs = sideBets.perfectPairs * 5
  }
  return sideBetsInfo
}

/**
 * Verify if the action name is allowed in a specific stage.
 * This method is used during the action dispatch before to consider
 * the real state of the game or more complex game situations.
 * @param actionName any action name available
 * @param stage any stage name
 * @returns {boolean}
 */
const isActionAllowed = (actionName, stage) => {
  if (actionName === 'RESTORE') {
    return true
  }
  switch (stage) {
    case 'ready': {
      return ['RESTORE', 'DEAL'].indexOf(actionName) > -1
    }
    case 'player-turn-right': {
      return ['STAND', 'INSURANCE', 'NOINSURANCE', 'SURRENDER', 'SPLIT', 'HIT', 'DOUBLE'].indexOf(actionName) > -1
    }
    case 'player-turn-left': {
      return ['STAND', 'HIT', 'DOUBLE'].indexOf(actionName) > -1
    }
    case 'showdown': {
      return ['SHOWDOWN', 'STAND'].indexOf(actionName) > -1
    }
    case 'dealer-turn': {
      return ['DEALER-HIT'].indexOf(actionName) > -1
    }
    default: {
      return false
    }
  }
}

const getPrize = (playerHand, dealerCards) => {
  const {
    close = false,
    playerInsuranceValue = 0,
    playerHasSurrendered = true,
    playerHasBlackjack = false,
    playerHasBusted = true,
    playerValue = {},
    bet = 0
  } = playerHand
  const dealerValue = calculate(dealerCards).hi
  const dealerHasBlackjack = isBlackjack(dealerCards)
  const insurancePrize = dealerHasBlackjack && playerInsuranceValue > 0 ? playerInsuranceValue * 2 : 0
  if (!close) {
    return 0
  }
  if (playerHasBusted) {
    return insurancePrize
  }
  if (playerHasSurrendered) {
    return bet / 2 + insurancePrize
  }
  if (playerHasBlackjack) {
    return bet + (bet * 1.5) + insurancePrize
  }
  const dealerHasBusted = dealerValue > 21
  if (dealerHasBusted) {
    return (bet + bet) + insurancePrize
  }
  if (playerValue.hi > dealerValue) {
    return (bet + bet) + insurancePrize
  } else if (playerValue.hi === dealerValue) {
    return bet + insurancePrize
  }
  return insurancePrize
}

module.exports.newDeck = newDeck
module.exports.newDecks = newDecks
module.exports.shuffle = shuffle
module.exports.calculate = calculate
module.exports.countCards = countCards
module.exports.getHandInfo = getHandInfo
module.exports.getHandInfoAfterDeal = getHandInfoAfterDeal
module.exports.getHandInfoAfterSplit = getHandInfoAfterSplit
module.exports.getHandInfoAfterHit = getHandInfoAfterHit
module.exports.getHandInfoAfterDouble = getHandInfoAfterDouble
module.exports.getHandInfoAfterStand = getHandInfoAfterStand
module.exports.getHandInfoAfterSurrender = getHandInfoAfterSurrender
module.exports.getHandInfoAfterInsurance = getHandInfoAfterInsurance
module.exports.getSideBetsInfo = getSideBetsInfo
module.exports.isBlackjack = isBlackjack
module.exports.serializeCard = serializeCard
module.exports.serializeCards = serializeCards
module.exports.isActionAllowed = isActionAllowed
module.exports.getPrize = getPrize
