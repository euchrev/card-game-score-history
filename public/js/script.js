$(document).ready(function() {
  $("#secondBlock, #thirdBlock").hide();
});

$(".team-toggle").click(function() {
  $("#teams-leaderboard").show();
  $("#members-leaderboard").hide();
  $("#settings").hide();
});

$(".members-toggle").click(function() {
  $("#teams-leaderboard").hide();
  $("#members-leaderboard").show();
  $("#settings").hide();
});

$(".settings-toggle").click(function() {
  $("#teams-leaderboard").hide();
  $("#members-leaderboard").hide();
  $("#").show();
});
