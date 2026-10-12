import { runScheduledLinkCheck } from "./js/features/linkHealth/check.js";
import { linkHealthIntervalMinutes } from "./defaults.js";

const LINK_HEALTH_ALARM = "linkHealthCheck";

async function ensureLinkHealthAlarm() {
  if (await chrome.alarms.get(LINK_HEALTH_ALARM)) return;
  chrome.alarms.create(LINK_HEALTH_ALARM, { periodInMinutes: linkHealthIntervalMinutes });
}

chrome.runtime.onInstalled.addListener(ensureLinkHealthAlarm);
chrome.runtime.onStartup.addListener(ensureLinkHealthAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LINK_HEALTH_ALARM) runScheduledLinkCheck();
});
