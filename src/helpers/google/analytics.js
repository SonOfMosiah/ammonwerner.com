import ReactGA from 'react-ga4'

export function analyticsEvent (category, action, label, nonInteraction) {
  ReactGA.event({
    category: category,
    action: action,
    label: label,
    nonInteraction: nonInteraction !== undefined ? nonInteraction : false
  })
}