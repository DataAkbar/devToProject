/* global checkUserLoggedIn, instantClick, InstantClick, sendHapticMessage, showModalAfterError */

function initNotifications() {
  fetchNotificationsCount();
  markNotificationsAsRead();
  initReactions();
  listenForNotificationsBellClick();
  initFilter();
  initPagination();
  initLoadMoreButton();
}

function markNotificationsAsRead() {
  setTimeout(function () {
    if (document.getElementById('notifications-container')) {
      var xmlhttp;
      var locationAsArray = window.location.pathname.split('/');
      // Use regex to ensure only numbers in the original string are converted to integers
      var parsedLastParam = parseInt(
        locationAsArray[locationAsArray.length - 1].replace(/[^0-9]/g, ''),
        10,
      );

      xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function () {};

      var csrfToken = document.querySelector("meta[name='csrf-token']").content;

      if (Number.isInteger(parsedLastParam)) {
        xmlhttp.open(
          'Post',
          '/notifications/reads?org_id=' + parsedLastParam,
          true,
        );
      } else {
        xmlhttp.open('Post', '/notifications/reads', true);
      }
      xmlhttp.setRequestHeader('X-CSRF-Token', csrfToken);
      xmlhttp.send();
    }
  }, 450);
}

function fetchNotificationsCount() {
  if (
    document.getElementById('notifications-container') == null &&
    checkUserLoggedIn()
  ) {
    // Prefetch notifications page
    if (instantClick) {
      InstantClick.removeExpiredKeys('force');
      setTimeout(function () {
        InstantClick.preload(
          document.getElementById('notifications-link').href,
          'force',
        );
      }, 30);
    }
  }
}

function initReactions() {
  setTimeout(function () {
    if (document.getElementById('notifications-container')) {
      var butts = document.getElementsByClassName('reaction-button');

      for (var i = 0; i < butts.length; i++) {
        var butt = butts[i];
        butt.setAttribute('aria-pressed', butt.classList.contains('reacted'));

        butt.onclick = function (event) {
          event.preventDefault();
          sendHapticMessage('medium');
          var thisButt = this;
          thisButt.classList.add('reacted');

          function successCb(response) {
            if (response.result === 'create') {
              thisButt.classList.add('reacted');
              thisButt.setAttribute('aria-pressed', true);
            } else {
              thisButt.classList.remove('reacted');
              thisButt.setAttribute('aria-pressed', false);
            }
          }

          var formData = new FormData();
          formData.append('reactable_type', thisButt.dataset.reactableType);
          formData.append('category', thisButt.dataset.category);
          formData.append('reactable_id', thisButt.dataset.reactableId);

          getCsrfToken()
            .then(sendFetch('reaction-creation', formData))
            .then(function (response) {
              if (response.status === 200) {
                response.json().then(successCb);
              } else {
                showModalAfterError({
                  response,
                  element: 'reaction',
                  action_ing: 'updating',
                  action_past: 'updated',
                });
              }
            });
        };
      }

      butts = document.getElementsByClassName('toggle-reply-form');

      for (let i = 0; i < butts.length; i++) {
        const butt = butts[i];

        butt.onclick = function (event) {
          event.preventDefault();
          var thisButt = this;
          document
            .getElementById('comment-form-for-' + thisButt.dataset.reactableId)
            .classList.remove('hidden');
          thisButt.classList.add('hidden');
          thisButt.classList.remove('inline-flex');
          setTimeout(function () {
            document
              .getElementById(
                'comment-textarea-for-' + thisButt.dataset.reactableId,
              )
              .focus();
          }, 30);
        };
      }
    }
  }, 180);
}

function listenForNotificationsBellClick() {
  var notificationsLink = document.getElementById('notifications-link');
  if (notificationsLink) {
    setTimeout(function () {
      notificationsLink.onclick = function () {
        document.getElementById('notifications-number').classList.add('hidden');
      };
    }, 180);
  }
}

function initFilter() {
  const notificationsFilterSelect = document.getElementById(
    'notifications-filter__select',
  );
  const changeNotifications = (event) => {
    window.location.href = event.target.value;
  };
  if (notificationsFilterSelect) {
    notificationsFilterSelect.addEventListener('change', changeNotifications);
  }
}

function initPagination() {
  // paginators appear after each block of HTML notifications sent by the server
  const paginators = document.getElementsByClassName('notifications-paginator');
  if (paginators && paginators.length > 0) {
    const paginator = paginators[paginators.length - 1];

    if (paginator) {
      window
        .fetch(paginator.dataset.paginationPath, {
          method: 'GET',
          credentials: 'same-origin',
        })
        .then(function (response) {
          if (response.status === 200) {
            response.text().then(function (html) {
              const markup = html.trim();

              if (markup) {
                const container = document.getElementById('articles-list');

                const newNotifications = document.createElement('div');
                newNotifications.innerHTML = markup;

                paginator.remove();
                container.append(newNotifications);

                initReactions();
              } else {
                // no more notifications to load, we hide the load more wrapper
                const button = document.getElementById('load-more-button');
                if (button) {
                  button.style.display = 'none';
                }
                paginator.remove();
              }
            });
          }
        });
    }
  }
}

function initLoadMoreButton() {
  const button = document.getElementById('load-more-button');
  if (button) {
    button.addEventListener('click', initPagination);
  }
};
/* global insertAfter, insertArticles, buildArticleHTML, nextPage:writable, fetching:writable, done:writable, InstantClick */

var client;

function fetchNext(el, endpoint, insertCallback) {
  var indexParams = JSON.parse(el.dataset.params);
  var urlParams = Object.keys(indexParams)
    .map(function handleMap(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(indexParams[k]);
    })
    .join('&');
  if (urlParams.indexOf('q=') > -1) {
    return;
  }
  var fetchUrl = (
    endpoint +
    '?page=' +
    nextPage +
    '&' +
    urlParams +
    '&signature=' +
    parseInt(Date.now() / 400000, 10)
  ).replace('&&', '&');
  window
    .fetch(fetchUrl)
    .then(function handleResponse(response) {
      response.json().then(function insertEntries(entries) {
        nextPage += 1;
        insertCallback(entries);
        if (entries.length === 0) {
          const loadingElement = document.getElementById('loading-articles');
          if (loadingElement) {
            loadingElement.style.display = 'none';
          }
          done = true;
        }
      });
    })
    .catch(function logError(err) {
      // eslint-disable-next-line no-console
      console.log(err);
    });
}

function insertNext(params, buildCallback) {
  return function insertEntries(entries = []) {
    var list = document.getElementById(params.listId || 'sublist');
    var newFollowersHTML = '';
    entries.forEach(function insertAnEntry(entry) {
      let existingEl = document.getElementById(
        (params.elId || 'element') + '-' + entry.id,
      );
      if (!existingEl) {
        var newHTML = buildCallback(entry);
        newFollowersHTML += newHTML;
      }
    });

    var followList = document.getElementById('following-wrapper');
    if (followList) {
      followList.insertAdjacentHTML('beforeend', newFollowersHTML);
    }
    if (nextPage > 0) {
      fetching = false;
    }
  };
}

function buildFollowsHTML(follows) {
  return (
    '<div class="crayons-card p-4 m:p-6 flex s:grid single-article" id="follows-' +
    follows.id +
    '">' +
    '<a href="' +
    follows.path +
    '" class="crayons-avatar crayons-avatar--2xl s:mb-2 s:mx-auto">' +
    '<img alt="@' +
    follows.username +
    ' profile image" class="crayons-avatar__image" src="' +
    follows.profile_image +
    '" />' +
    '</a>' +
    '<div class="pl-4 s:pl-0 self-center">' +
    '<h3 class="s:mb-1 p-0">' +
    '<a href="' +
    follows.path +
    '">' +
    follows.name +
    '</a>' +
    '</h3>' +
    '<p class="s:mb-4">' +
    '<a href="' +
    follows.path +
    '" class="crayons-link crayons-link--secondary">' +
    '@' +
    follows.username +
    '</a>' +
    '</p>' +
    '</div>' +
    '</div>'
  );
}

function buildTagsHTML(tag) {
  var antifollow = '';
  if (tag.points < 0) {
    antifollow =
      '<span class="c-indicator c-indicator--danger" title="This tag has negative follow weight">Anti-follow</span>';
  }

  return `<div class="crayons-card p-4 m:p-6 flex flex-col single-article" id="follows-${tag.id}" style="border: 1px solid ${tag.color}; box-shadow: 3px 3px 0 ${tag.color}">
    <h3 class="s:mb-1 p-0 fw-medium">
      <a href="/t/${tag.name}" class="crayons-tag crayons-tag--l">
        <span class="crayons-tag__prefix">#</span>${tag.name}
      </a>
      ${antifollow}
    </h3>
    <p class="grid-cell__summary truncate-at-3"></p>
    <input name="follows[][id]" id="follow_id_${tag.name}" type="hidden" form="follows_update_form" value="${tag.id}">
    <input step="any" class="crayons-textfield flex-1 fs-s" required="required" type="number" form="follows_update_form" value="${tag.points}" name="follows[][explicit_points]" id="follow_points_${tag.name}" aria-label="${tag.name} tag weight">
  </div>`;
}

function fetchNextFollowingPage(el) {
  var indexParams = JSON.parse(el.dataset.params);
  var action = indexParams.action;
  if (action.includes('users')) {
    fetchNext(
      el,
      '/followings/users',
      insertNext({ elId: 'follows' }, buildFollowsHTML),
    );
  } else if (action.includes('podcasts')) {
    fetchNext(
      el,
      '/followings/podcasts',
      insertNext({ elId: 'follows' }, buildFollowsHTML),
    );
  } else if (action.includes('organizations')) {
    fetchNext(
      el,
      '/followings/organizations',
      insertNext({ elId: 'follows' }, buildFollowsHTML),
    );
  } else {
    fetchNext(
      el,
      '/followings/tags',
      insertNext({ elId: 'follows' }, buildTagsHTML),
    );
  }
}

function fetchNextFollowersPage(el) {
  fetchNext(
    el,
    '/api/followers/users',
    insertNext({ elId: 'follows' }, buildFollowsHTML),
  );
}

function buildVideoArticleHTML(videoArticle) {
  return `<a href="${videoArticle.path}" id="video-article-${videoArticle.id}" class="crayons-card media-card">
    <div class="media-card__artwork">
      <img src="${videoArticle.cloudinary_video_url}" class="w-100 object-cover block aspect-16-9 h-auto" width="320" height="180" alt="${videoArticle.title}">
      <span class="media-card__artwork__badge">${videoArticle.video_duration_in_minutes}</span>
    </div>
    <div class="media-card__content">
      <h2 class="fs-base mb-2 fw-medium">${videoArticle.title}</h2>
      <small class="fs-s">
        ${videoArticle.user.name}
      </small>
    </div>
  </a>`;
}

function insertVideos(videoArticles) {
  var list = document.getElementById('subvideos');
  var newVideosHTML = '';
  videoArticles.forEach(function insertAVideo(videoArticle) {
    var existingEl = document.getElementById(
      'video-article-' + videoArticle.id,
    );
    if (!existingEl) {
      var newHTML = buildVideoArticleHTML(videoArticle);
      newVideosHTML += newHTML;
    }
  });

  var distanceFromBottom =
    document.documentElement.scrollHeight - document.body.scrollTop;

  var parentNode = document.querySelector('.js-video-collection');
  var frag = document.createRange().createContextualFragment(newVideosHTML);
  parentNode.appendChild(frag);

  if (nextPage > 0) {
    fetching = false;
  }
}

function fetchNextVideoPage(el) {
  fetchNext(el, '/api/videos', insertVideos);
}

function insertArticles(articles) {
  var list = document.getElementById('substories');
  var newArticlesHTML = '';
  var el = document.getElementById('home-articles-object');
  if (el) {
    el.outerHTML = '';
  }
  articles.forEach(function insertAnArticle(article) {
    var existingEl = document.getElementById('article-link-' + article.id);
    if (
      ![
        '/',
        '/top/week',
        '/top/month',
        '/top/year',
        '/top/infinity',
        '/latest',
      ].includes(window.location.pathname) &&
      existingEl &&
      existingEl.parentElement &&
      existingEl.parentElement.classList.contains('crayons-story') &&
      !document.getElementById('video-player-' + article.id)
    ) {
      existingEl.parentElement.outerHTML = buildArticleHTML(article);
    } else if (!existingEl) {
      var newHTML = buildArticleHTML(article);
      newArticlesHTML += newHTML;
      initializeReadingListIcons();
    }
  });
  var distanceFromBottom =
    document.documentElement.scrollHeight - document.body.scrollTop;
  var newNode = document.createElement('div');
  newNode.classList.add('paged-stories');
  newNode.innerHTML = newArticlesHTML;

  newNode.addEventListener('click', (event) => {
    const { classList } = event.target;

    // This looks a little messy, but it's the only
    // way to make the entire card clickable.
    if (
      classList.contains('crayons-story') ||
      classList.contains('crayons-story__top') ||
      classList.contains('crayons-story__body') ||
      classList.contains('crayons-story__indention') ||
      classList.contains('crayons-story__title') ||
      classList.contains('crayons-story__tags') ||
      classList.contains('crayons-story__bottom')
    ) {
      let element = event.target;
      let { articlePath } = element.dataset;

      while (!articlePath) {
        articlePath = element.dataset.articlePath;
        element = element.parentElement;
      }

      InstantClick.preload(articlePath);
      InstantClick.display(articlePath);
    }
  });

  var singleArticles = document.querySelectorAll(
    '.single-article, .crayons-story',
  );
  var lastElement = singleArticles[singleArticles.length - 1];
  insertAfter(newNode, lastElement);
  if (nextPage > 0) {
    fetching = false;
  }
}

function paginate(tag, params, requiresApproval) {
  const searchHash = Object.assign(
    { per_page: 15, page: nextPage },
    JSON.parse(params),
  );

  if (tag && tag.length > 0) {
    searchHash.tag_names = searchHash.tag_names || [];
    searchHash.tag_names.push(tag);
  }
  searchHash.approved = requiresApproval === 'true' ? 'true' : '';

  var homeEl = document.getElementById('index-container');
  if (homeEl.dataset.feed === 'base-feed') {
    searchHash.class_name = 'Article';
  } else if (homeEl.dataset.feed === 'latest') {
    searchHash.class_name = 'Article';
    searchHash.sort_by = 'published_at';
  } else {
    searchHash.class_name = 'Article';
    searchHash['published_at[gte]'] = homeEl.dataset.articlesSince;
    searchHash.sort_by = 'public_reactions_count';
  }

  // Brute force copying code from a utility for quick fix
  const searchParams = new URLSearchParams();
  Object.keys(searchHash).forEach((key) => {
    const value = searchHash[key];
    if (Array.isArray(value)) {
      value.forEach((arrayValue) => {
        searchParams.append(`${key}[]`, arrayValue);
      });
    } else {
      searchParams.append(key, value);
    }
  });

  fetch(`/search/feed_content?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': window.csrfToken,
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  })
    .then((response) => response.json())
    .then((content) => {
      nextPage += 1;
      insertArticles(content.result);
      const checkBlockedContentEvent = new CustomEvent('checkBlockedContent');
      window.dispatchEvent(checkBlockedContentEvent);
      initializeReadingListIcons();
      if (content.result.length === 0) {
        const loadingElement = document.getElementById('loading-articles');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        done = true;
      }
    });
}

function fetchNextPageIfNearBottom() {
  var indexContainer = document.getElementById('index-container');
  var elCheck = indexContainer && !document.getElementById('query-wrapper');
  if (!elCheck) {
    return;
  }

  var indexWhich = indexContainer.dataset.which;

  var fetchCallback;
  var scrollableElem;

  if (indexWhich === 'videos') {
    scrollableElem = document.getElementById('main-content');
    fetchCallback = function fetch() {
      fetchNextVideoPage(indexContainer);
    };
  } else if (indexWhich === 'followers') {
    scrollableElem = document.getElementById('user-dashboard');
    fetchCallback = function fetch() {
      fetchNextFollowersPage(indexContainer);
    };
  } else if (indexWhich === 'following') {
    scrollableElem = document.getElementById('user-dashboard');
    fetchCallback = function fetch() {
      fetchNextFollowingPage(indexContainer);
    };
  } else {
    scrollableElem =
      document.getElementById('main-content') ||
      document.getElementById('articles-list');

    fetchCallback = function fetch() {
      paginate(
        indexContainer.dataset.tag,
        indexContainer.dataset.params,
        indexContainer.dataset.requiresApproval,
      );
    };
  }

  if (
    !done &&
    !fetching &&
    window.scrollY > scrollableElem.scrollHeight - 3700
  ) {
    fetching = true;
    fetchCallback();
  }
}

function checkIfNearBottomOfPage() {
  const loadingElement = document.getElementById('loading-articles');
  if (
    (document.getElementsByClassName('crayons-story').length < 2 &&
      document.getElementsByClassName('single-article').length < 2) ||
    window.location.search.indexOf('q=') > -1
  ) {
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    done = true;
  } else if (loadingElement) {
    loadingElement.style.display = 'block';
  }
  fetchNextPageIfNearBottom();
  setInterval(function handleInterval() {
    fetchNextPageIfNearBottom();
  }, 210);
}

function initScrolling() {
  var elCheck = document.getElementById('index-container');

  if (elCheck) {
    initScrolling.called = true;
    checkIfNearBottomOfPage();
  }
};
'use strict';

function initializeAllTagEditButtons() {
  var tagEditButton = document.getElementById('tag-edit-button');
  var tagAdminButton = document.getElementById('tag-admin-button');
  var user = userData();
  if (user.admin && tagAdminButton) {
    tagAdminButton.style.display = 'inline-block';
    document.getElementById('tag-admin-button').style.display = 'inline-block';
  }
  if (
    user &&
    tagEditButton &&
    (user.moderator_for_tags.indexOf(tagEditButton.dataset.tag) > -1 ||
      user.admin)
  ) {
    tagEditButton.style.display = 'inline-block';
    document.getElementById('tag-mod-button').style.display = 'inline-block';
  }
};
'use strict';

function archivedPosts() {
  return document.getElementsByClassName('story-archived');
}

function showArchivedPosts() {
  var posts = archivedPosts();

  for (var i = 0; i < posts.length; i += 1) {
    posts[i].classList.remove('hidden');
  }
}

function hideArchivedPosts() {
  var posts = archivedPosts();

  for (var i = 0; i < posts.length; i += 1) {
    posts[i].classList.add('hidden');
  }
}

function toggleArchivedPosts(e) {
  e.preventDefault();
  var link = e.target;

  if (link.innerHTML.match(/Show/)) {
    link.innerHTML = 'Hide archived';
    showArchivedPosts();
  } else {
    link.innerHTML = 'Show archived';
    hideArchivedPosts();
  }
}

function initializeArchivedPostFilter() {
  var link = document.getElementById('toggleArchivedLink');
  if (link) {
    link.addEventListener('click', toggleArchivedPosts);
  }
};
/* Show article date/time according to user's locale */
/* global addLocalizedDateTimeToElementsTitles */

function initializeArticleDate() {
  var articlesDates = document.querySelectorAll(
    '.crayons-story time, article time, .single-other-article time',
  );

  addLocalizedDateTimeToElementsTitles(articlesDates, 'datetime');
};
/* global sendHapticMessage, showLoginModal, showModalAfterError */

// Set reaction count to correct number
function setReactionCount(reactionName, newCount) {
  var reactionClassList = document.getElementById(
    'reaction-butt-' + reactionName,
  ).classList;
  var reactionNumber = document.getElementById(
    'reaction-number-' + reactionName,
  );
  if (newCount > 0) {
    reactionClassList.add('activated');
    reactionNumber.textContent = newCount;
  } else {
    reactionClassList.remove('activated');
    reactionNumber.textContent = '0';
  }
}

function showUserReaction(reactionName, animatedClass) {
  const reactionButton = document.getElementById(
    'reaction-butt-' + reactionName,
  );
  reactionButton.classList.add('user-activated', animatedClass);
  reactionButton.setAttribute('aria-pressed', 'true');
}

function hideUserReaction(reactionName) {
  const reactionButton = document.getElementById(
    'reaction-butt-' + reactionName,
  );
  reactionButton.classList.remove('user-activated', 'user-animated');
  reactionButton.setAttribute('aria-pressed', 'false');
}

function hasUserReacted(reactionName) {
  return document
    .getElementById('reaction-butt-' + reactionName)
    .classList.contains('user-activated');
}

function getNumReactions(reactionName) {
  const reactionEl = document.getElementById('reaction-number-' + reactionName);
  if (!reactionEl || reactionEl.textContent === '') {
    return 0;
  }

  return parseInt(reactionEl.textContent, 10);
}

function reactToArticle(articleId, reaction) {
  // Visually toggle the reaction
  function toggleReaction() {
    var currentNum = getNumReactions(reaction);
    if (hasUserReacted(reaction)) {
      hideUserReaction(reaction);
      setReactionCount(reaction, currentNum - 1);
    } else {
      showUserReaction(reaction, 'user-animated');
      setReactionCount(reaction, currentNum + 1);
    }
  }
  var userStatus = document.body.getAttribute('data-user-status');
  sendHapticMessage('medium');
  if (userStatus === 'logged-out') {
    showLoginModal();
    return;
  }
  toggleReaction();
  document.getElementById('reaction-butt-' + reaction).disabled = true;

  function createFormdata() {
    /*
     * What's not shown here is that "authenticity_token" is included in this formData.
     * The logic can be seen in sendFetch.js.
     */
    var formData = new FormData();
    formData.append('reactable_type', 'Article');
    formData.append('reactable_id', articleId);
    formData.append('category', reaction);
    return formData;
  }

  getCsrfToken()
    .then(sendFetch('reaction-creation', createFormdata()))
    .then((response) => {
      if (response.status === 200) {
        return response.json().then(() => {
          document.getElementById('reaction-butt-' + reaction).disabled = false;
        });
      } else {
        toggleReaction();
        document.getElementById('reaction-butt-' + reaction).disabled = false;
        showModalAfterError({
          response,
          element: 'reaction',
          action_ing: 'updating',
          action_past: 'updated',
        });
        return undefined;
      }
    })
    .catch((error) => {
      toggleReaction();
      document.getElementById('reaction-butt-' + reaction).disabled = false;
    });
}

function setCollectionFunctionality() {
  if (document.getElementById('collection-link-inbetween')) {
    var inbetweenLinks = document.getElementsByClassName(
      'series-switcher__link--inbetween',
    );
    var inbetweenLinksLength = inbetweenLinks.length;
    for (var i = 0; i < inbetweenLinks.length; i += 1) {
      inbetweenLinks[i].onclick = (e) => {
        e.preventDefault();
        var els = document.getElementsByClassName(
          'series-switcher__link--hidden',
        );
        var elsLength = els.length;
        for (var j = 0; j < elsLength; j += 1) {
          els[0].classList.remove('series-switcher__link--hidden');
        }
        for (var k = 0; k < inbetweenLinksLength; k += 1) {
          inbetweenLinks[0].className = 'series-switcher__link--hidden';
        }
      };
    }
  }
}

function requestReactionCounts(articleId) {
  var ajaxReq;
  ajaxReq = new XMLHttpRequest();
  ajaxReq.onreadystatechange = () => {
    if (ajaxReq.readyState === XMLHttpRequest.DONE) {
      var json = JSON.parse(ajaxReq.response);
      json.article_reaction_counts.forEach((reaction) => {
        setReactionCount(reaction.category, reaction.count);
      });
      json.reactions.forEach((reaction) => {
        if (document.getElementById('reaction-butt-' + reaction.category)) {
          showUserReaction(reaction.category, 'not-user-animated');
        }
      });
    }
  };
  ajaxReq.open('GET', '/reactions?article_id=' + articleId, true);
  ajaxReq.send();
}

function initializeArticleReactions() {
  setCollectionFunctionality();

  setTimeout(() => {
    var reactionButts = document.getElementsByClassName('crayons-reaction');

    // we wait for the article to appear,
    // we also check that reaction buttons are there as draft articles don't have them
    if (document.getElementById('article-body') && reactionButts.length > 0) {
      var articleId = document.getElementById('article-body').dataset.articleId;

      requestReactionCounts(articleId);

      for (var i = 0; i < reactionButts.length; i += 1) {
        reactionButts[i].onclick = function addReactionOnClick(e) {
          reactToArticle(articleId, this.dataset.category);
        };
      }
    }
  }, 3);
};
function initializeBaseTracking() {
  var wait = 0;
  var addedGA = false;
  var gaTrackingCode = document.body.dataset.gaTracking;
  if (gaTrackingCode) {
    var waitingOnGA = setInterval(function() {
      if (!addedGA) {
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                                 m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
      }
      addedGA = true;
      wait++;
      if (window.ga && ga.create) {
        ga('create', gaTrackingCode, 'auto');
        ga('set', 'anonymizeIp', true);
        ga('send', 'pageview', location.pathname + location.search);
        clearInterval(waitingOnGA);
      }
      if (wait > 85) {
        clearInterval(waitingOnGA);
        fallbackActivityRecording();
      }
    }, 25);
    eventListening();
  }
  trackCustomImpressions();
}

function fallbackActivityRecording() {
  var tokenMeta = document.querySelector("meta[name='csrf-token']")
  if (!tokenMeta) {
    return
  }
  var csrfToken = tokenMeta.getAttribute('content')
  var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  var screenW = window.screen.availWidth;
  var screenH = window.screen.availHeight;
  var dataBody = {
    path: location.pathname + location.search,
    user_language: navigator.language,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    viewport_size: h + 'x' + w,
    screen_resolution: screenH + 'x' + screenW,
    document_title: document.title,
    document_encoding: document.characterSet,
    document_path: location.pathname + location.search,
  };
  window.fetch('/fallback_activity_recorder', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(dataBody),
    credentials: 'same-origin'
  });
}

function eventListening(){
  var registerNowButt = document.getElementById("cta-comment-register-now-link");
  if (registerNowButt) {
    registerNowButt.onclick = function(){
      ga('send', 'event', 'click', 'register-now-click', null, null);
    }
  }
}

function trackCustomImpressions() {
  setTimeout(function(){
    var ArticleElement = document.getElementById('article-body') || document.getElementById('comment-article-indicator');
    var tokenMeta = document.querySelector("meta[name='csrf-token']")
    var isBot = /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex/i.test(navigator.userAgent) // is crawler
    var windowBigEnough =  window.innerWidth > 1023

    // Sidebar HTML variant tracking
    var stickyNav = document.getElementById('article-show-primary-sticky-nav');
    var sidebarHTMLVariant = document.getElementById('html-variant-article-show-sidebar');
    if (sidebarHTMLVariant && ArticleElement && tokenMeta && !isBot && windowBigEnough) {
      var dataBody = {
        html_variant_id: sidebarHTMLVariant.dataset.variantId,
        article_id: ArticleElement.dataset.articleId,
      };
      var csrfToken = tokenMeta.getAttribute('content');
      trackHTMLVariantTrial(dataBody, csrfToken)
      var successLinks = stickyNav.querySelectorAll('a,button'); //track all links and button clicks within nav
      for(var i = 0; i < successLinks.length; i++)
      {
        successLinks[i].addEventListener('click', function() { trackHtmlVariantSuccess(dataBody, csrfToken) });
      }
    }

    // Below article HTML variant tracking
    var belowArticleHTMLVariant = document.getElementById('html-variant-article-show-below-article');
    if (belowArticleHTMLVariant && ArticleElement && tokenMeta && !isBot && windowBigEnough) {
      var dataBody = {
        html_variant_id: belowArticleHTMLVariant.dataset.variantId,
        article_id: ArticleElement.dataset.articleId,
      };
      var csrfToken = tokenMeta.getAttribute('content');
      trackHTMLVariantTrial(dataBody, csrfToken)
      var successLinks = belowArticleHTMLVariant.querySelectorAll('a,button'); //track all links and button clicks within nav
      for(var i = 0; i < successLinks.length; i++)
      {
        successLinks[i].addEventListener('click', function() { trackHtmlVariantSuccess(dataBody, csrfToken) });
      }
    }

    // page view
    if (ArticleElement && tokenMeta && !isBot) {
      // See https://github.com/forem/forem/blob/main/app/controllers/page_views_controller.rb
      //
      // If you change the 10, you should look at the PageViewsController as well.
      var randomNumber = Math.floor(Math.random() * 10); // 1 in 10; Only track 1 in 10 impressions
      if (!checkUserLoggedIn() && randomNumber != 1) {
        return;
      }
      var dataBody = {
        article_id: ArticleElement.dataset.articleId,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      };
      var csrfToken = tokenMeta.getAttribute('content');
      trackPageView(dataBody, csrfToken);
      var timeOnSiteCounter = 0;
      var timeOnSiteInterval = setInterval(function(){
        timeOnSiteCounter++
        var ArticleElement = document.getElementById('article-body') || document.getElementById('comment-article-indicator');
        if (ArticleElement && checkUserLoggedIn()) {
          trackFifteenSecondsOnPage(ArticleElement.dataset.articleId, csrfToken);
        } else {
          clearInterval(timeOnSiteInterval);
        }
        if ( timeOnSiteCounter > 118 ) {
          clearInterval(timeOnSiteInterval);
        }
      }, 15000)
    }

    // display add
    var displayAds = document.querySelectorAll('[data-display-unit]');
    if (displayAds.length > 0
      && tokenMeta
      && !isBot
      && windowBigEnough
      && checkUserLoggedIn()) {
        var csrfToken = tokenMeta.getAttribute('content');
        displayAds.forEach(unit => {
          trackAdImpression(csrfToken, unit);
          unit.removeEventListener('click', trackAdClick, false );
          unit.addEventListener('click', function(e) { trackAdClick(csrfToken, e.target) });
        });
      }
  }, 1800)
}

function trackHTMLVariantTrial(dataBody, csrfToken) {
  var randomNumber = Math.floor(Math.random() * 10); // 1 in 10; Only track 1 in 10 impressions
  if (randomNumber === 1) {
    window.fetch('/html_variant_trials', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataBody),
      credentials: 'same-origin',
    });
  }
}

function trackHtmlVariantSuccess(dataBody, csrfToken) {
  window.fetch('/html_variant_successes', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataBody),
    credentials: 'same-origin',
  })
}

function trackPageView(dataBody, csrfToken) {
  window.fetch('/page_views', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataBody),
    credentials: 'same-origin',
  })
}

function trackFifteenSecondsOnPage(articleId, csrfToken) {
  window.fetch('/page_views/' + articleId, {
    method: 'PATCH',
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  }).catch((error) => console.error(error))
}

function trackAdImpression(token, adBox) {
  var dataBody = {
    display_ad_event: {
      display_ad_id: adBox.dataset.id,
      context_type: "home",
      category: "impression",
    }
  }
  window.fetch('/display_ad_events', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataBody),
    credentials: 'same-origin',
  }).catch((error) => console.error(error))
}

function trackAdClick(token, clickedElement) {
  var adBox = clickedElement.closest('[data-display-unit]');
  if (!adClicked) {
    var dataBody = {
      display_ad_event: {
        display_ad_id: adBox.dataset.id,
        context_type: "home",
        category: "click",
      }
    }
    window.fetch('/display_ad_events', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataBody),
      credentials: 'same-origin',
    })
  }
  adClicked = true;
};
/* global filterXSS */
function initializeProfileImage(user) {
  if (!document.getElementById('comment-primary-user-profile--avatar')) return;
  document.getElementById('comment-primary-user-profile--avatar').src =
    user.profile_image_90;
}

function addRelevantButtonsToArticle(user) {
  var articleContainer = document.getElementById('article-show-container');

  if (
    articleContainer &&
    articleContainer.dataset.buttonsInitialized !== 'true'
  ) {
    let actions = [];
    const published = JSON.parse(articleContainer.dataset.published);

    if (parseInt(articleContainer.dataset.authorId, 10) === user.id) {
      actions.push(
        `<a class="crayons-btn crayons-btn--s crayons-btn--ghost px-2" href="${articleContainer.dataset.path}/edit" rel="nofollow">Edit</a>`,
      );

      let clickToEditButton = document.getElementById('author-click-to-edit');
      if (clickToEditButton) {
        clickToEditButton.style.display = 'inline-block';
      }

      if (published === true) {
        actions.push(
          `<a class="crayons-btn crayons-btn--s crayons-btn--ghost px-2" href="${articleContainer.dataset.path}/manage" rel="nofollow">Manage</a>`,
        );
      }

      actions.push(
        `<a class="crayons-btn crayons-btn--s crayons-btn--ghost px-2" href="${articleContainer.dataset.path}/stats" rel="nofollow">Stats</a>`,
      );
    }

    const { articleId, pinnedArticleId } = articleContainer.dataset;

    // we hide the buttons for draft articles, for non admins and
    // if there's already a pinned post different from the current one
    if (user.admin) {
      actions.push(
        `<a class="crayons-btn crayons-btn--s crayons-btn--ghost px-2" href="/admin/content_manager/articles/${articleId}" data-no-instant>Admin</a>`,
      );
    }

    document.getElementById('action-space').innerHTML = actions.join('');
    articleContainer.dataset.buttonsInitialized = 'true';
  }
}

function addRelevantButtonsToComments(user) {
  if (document.getElementById('comments-container')) {
    // buttons are actually <span>'s
    var settingsButts = document.getElementsByClassName('comment-actions');

    for (let i = 0; i < settingsButts.length; i += 1) {
      let butt = settingsButts[i];
      const { action, commentableUserId, userId } = butt.dataset;
      if (parseInt(userId, 10) === user.id && action === 'settings-button') {
        butt.innerHTML =
          '<a href="' +
          butt.dataset.path +
          '" rel="nofollow" class="crayons-link crayons-link--block" data-no-instant>Settings</a>';
        butt.classList.remove('hidden');
        butt.classList.add('block');
      }

      if (
        action === 'hide-button' &&
        parseInt(commentableUserId, 10) === user.id
      ) {
        butt.classList.remove('hidden');
        butt.classList.add('block');
      }
    }

    if (user.trusted) {
      var modButts = document.getElementsByClassName('mod-actions');
      for (let i = 0; i < modButts.length; i += 1) {
        let butt = modButts[i];
        if (butt.classList.contains('mod-actions-comment-button')) {
          butt.innerHTML =
            '<a href="' +
            butt.dataset.path +
            '" rel="nofollow" class="crayons-link crayons-link--block">Moderate</a>';
        }
        butt.className = 'mod-actions';
        butt.classList.remove('hidden');
        butt.classList.add('block');
      }
    }
  }
}

function setCurrentUserToNavBar(user) {
  const userNavLink = document.getElementById('first-nav-link');
  userNavLink.href = `/${user.username}`;
  userNavLink.getElementsByTagName('span')[0].textContent = user.name;
  userNavLink.getElementsByTagName(
    'small',
  )[0].textContent = `@${user.username}`;
  document.getElementById('nav-profile-image').src = user.profile_image_90;
  if (user.admin) {
    document
      .getElementsByClassName('js-header-menu-admin-link')[0]
      .classList.remove('hidden');
  }
}

function initializeBaseUserData() {
  const user = userData();
  setCurrentUserToNavBar(user);
  initializeProfileImage(user);
  addRelevantButtonsToArticle(user);
  addRelevantButtonsToComments(user);
};
/* global checkUserLoggedIn */

function removeExistingCSRF() {
  var csrfTokenMeta = document.querySelector("meta[name='csrf-token']");
  var csrfParamMeta = document.querySelector("meta[name='csrf-param']");
  if (csrfTokenMeta && csrfParamMeta) {
    csrfTokenMeta.parentNode.removeChild(csrfTokenMeta);
    csrfParamMeta.parentNode.removeChild(csrfParamMeta);
  }
}

/* TODO: prefer fetch() to XMLHttpRequest */
function fetchBaseData() {
  var xmlhttp;
  xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = () => {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      // Assigning CSRF
      var json = JSON.parse(xmlhttp.responseText);
      if (json.token) {
        removeExistingCSRF();
      }
      var newCsrfParamMeta = document.createElement('meta');
      newCsrfParamMeta.name = 'csrf-param';
      newCsrfParamMeta.content = json.param;
      document.head.appendChild(newCsrfParamMeta);
      var newCsrfTokenMeta = document.createElement('meta');
      newCsrfTokenMeta.name = 'csrf-token';
      newCsrfTokenMeta.content = json.token;
      document.head.appendChild(newCsrfTokenMeta);
      document.body.dataset.loaded = 'true';

      // Assigning Broadcast
      if (json.broadcast) {
        document.body.dataset.broadcast = json.broadcast;
      }

      // Assigning User
      if (checkUserLoggedIn()) {
        document.body.dataset.user = json.user;
        document.body.dataset.creator = json.creator;
        browserStoreCache('set', json.user);

        setTimeout(() => {
          if (typeof ga === 'function') {
            ga('set', 'userId', JSON.parse(json.user).id);
          }
        }, 400);
      } else {
        // Ensure user data is not exposed if no one is logged in
        delete document.body.dataset.user;
        delete document.body.dataset.creator;
        browserStoreCache('remove');
      }
    }
  };

  xmlhttp.open('GET', '/async_info/base_data', true);
  xmlhttp.send();
}

function initializeBodyData() {
  fetchBaseData();
};
/* eslint-disable camelcase */
/**
 * Parses the broadcast object on the document into JSON.
 *
 * @function broadcastData
 * @returns {Object} Returns an object of the parsed broadcast data.
 */
function broadcastData() {
  const { broadcast = null } = document.body.dataset;

  return JSON.parse(broadcast);
}

/**
 * Parses the broadcast object on the document into JSON.
 *
 * @function camelizedBroadcastKey
 * @param {string} title The title of the broadcast.
 * @returns {string} Returns the camelized title appended with "Seen".
 */
function camelizedBroadcastKey(title) {
  const camelizedTitle = title.replace(/\W+(.)/g, (match, string) => {
    return string.toUpperCase();
  });

  return `${camelizedTitle}Seen`;
}

/**
 * A function that finds the close button and adds a click handler to it.
 * The click handler sets a key in local storage and removes the broadcast
 * element entirely from the DOM.
 *
 * @function addCloseButtonClickHandle
 * @param {string} title The title of the broadcast.
 */
function addCloseButtonClickHandle(title) {
  var closeButton = document.getElementsByClassName(
    'close-announcement-button',
  )[0];
  closeButton.onclick = (e) => {
    localStorage.setItem(camelizedBroadcastKey(title), true);
    document.getElementById('active-broadcast').remove();
  };
}

/**
 * A function to insert the broadcast's HTML into the `active-broadcast` element.
 * Determines what classes to add to the broadcast element,
 * and inserts a close button and adds a click handler to it.
 *
 * Adds a `.broadcast-visible` class to the broadcastElement to make it display.
 *
 * @function initializeBroadcast
 * @param {string} broadcastElement The HTML element for the broadcast, with a class of `.active-broadcast`.
 * @param {Object} data An object representing the parsed broadcast data.
 */
function renderBroadcast(broadcastElement, data) {
  const { banner_class, html, title } = data;

  if (banner_class) {
    const [defaultClass, additionalClass] = banner_class.split(' ');
    if (additionalClass) {
      broadcastElement.classList.add(defaultClass, additionalClass);
    } else {
      broadcastElement.classList.add(defaultClass);
    }
  }

  const closeButton = `<button class="close-announcement-button crayons-btn crayons-btn--icon-rounded crayons-btn--inverted crayons-btn--ghost">
    <svg class="crayons-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636l4.95 4.95z" /></svg>
  </button>`;

  broadcastElement.insertAdjacentHTML(
    'afterbegin',
    `<div class='broadcast-data'>${html}</div>${closeButton}`,
  );
  addCloseButtonClickHandle(title);
  broadcastElement.classList.add('broadcast-visible');
}

/**
 * A function to determine if a broadcast should render.
 * Does not render a broadcast in an iframe, or on `/connect` and `/new` routes.
 * Does not render a broadcast if the current user has opted-out,
 * if the broadcast has already been inserted, or if the key for
 * the broadcast's title exists in localStorage.
 *
 * @function initializeBroadcast
 */
function initializeBroadcast() {
  const shouldHideBroadcast = window.location.pathname.match(
    /^(?:\/connect|\/new)/,
  );

  // Iframes will attempt to re-render a broadcast, so we want to explicitly
  // avoid initializing one if we are within `window.frameElement`.
  if (window.frameElement || shouldHideBroadcast) {
    const broadcast = document.getElementById('active-broadcast');

    // Hide the broadcast if it exists and we are on a path where it should be hidden.
    if (broadcast) {
      broadcast.classList.remove('broadcast-visible');
    }
    return;
  }

  const user = userData();
  const data = broadcastData();

  if (user && !user.display_announcements) {
    return;
  }
  if (!data) {
    return;
  }

  const { title } = data;
  if (JSON.parse(localStorage.getItem(camelizedBroadcastKey(title))) === true) {
    return; // Do not render broadcast if previously dismissed by user.
  }

  const el = document.getElementById('active-broadcast');
  if (el.firstElementChild) {
    if (!el.classList.contains('broadcast-visible')) {
      // The articleForm may have hidden the broadcast when
      // it loaded, so we need to explicitly display it again.
      el.classList.toggle('broadcast-visible');
    }

    return; // Only append HTML once, on first render.
  }

  renderBroadcast(el, data);
}
/* eslint-enable camelcase */;
'use strict';

function initializeColorPicker() {
  var pickers = Array.from(document.getElementsByClassName('js-color-field'));

  function colorValueChange(e) {
    var field = e.target;
    var sibling = '';
    if (field.nextElementSibling) {
      sibling = field.nextElementSibling;
    } else {
      sibling = field.previousElementSibling;
    }

    sibling.value = field.value;
  }

  pickers.forEach(function (picker) {
    picker.addEventListener('change', colorValueChange);
  });
};
/* Show comment date/time according to user's locale */
/* global addLocalizedDateTimeToElementsTitles */

'use strict';

function initializeCommentDate() {
  var commentsDates = document.querySelectorAll('.comment-date time');

  addLocalizedDateTimeToElementsTitles(commentsDates, 'datetime');
};
/* global activateRunkitTags */

function getAndShowPreview(preview, editor) {
  function attachTwitterTimelineScript() {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }

  function successCb(body) {
    preview.innerHTML = body.processed_html; // eslint-disable-line no-param-reassign
    if (body.processed_html.includes('twitter-timeline')) {
      attachTwitterTimelineScript();
    }
    activateRunkitTags();
  }

  const payload = JSON.stringify({
    comment: {
      body_markdown: editor.value,
    },
  });
  getCsrfToken()
    .then(sendFetch('comment-preview', payload))
    .then((response) => {
      return response.json();
    })
    .then(successCb)
    .catch((err) => {
      console.log('error!'); // eslint-disable-line
      console.log(err); // eslint-disable-line no-console
    });
}

function handleCommentPreview(event) {
  event.preventDefault();
  const { form } = event.target;
  const editor = form.getElementsByClassName('comment-textarea')[0];
  const preview = form.getElementsByClassName('comment-form__preview')[0];
  const trigger = form.getElementsByClassName('preview-toggle')[0];

  if (editor.value !== '') {
    if (form.classList.contains('preview-open')) {
      form.classList.toggle('preview-open');
      trigger.innerHTML = 'Preview';
    } else {
      getAndShowPreview(preview, editor);
      const editorHeight = editor.offsetHeight + 43; // not ideal but prevents jumping screen
      preview.style.minHeight = `${editorHeight}px`;
      trigger.innerHTML = 'Continue editing';
      form.classList.toggle('preview-open');
    }
  }
}

function initializeCommentPreview() {
  const previewButton = document.getElementsByClassName('preview-toggle')[0];

  if (!previewButton) {
    return;
  }

  previewButton.addEventListener('click', handleCommentPreview);
};
var iconSmallThread = `<svg width="24" height="24" class="crayons-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 13l-5 6-5-6h3.125c0-3.314 2.798-6 6.25-6 .17 0 .34.006.506.02-1.787.904-3.006 2.705-3.006 4.78V13H17z" /></svg>`;

/**
 *
 * A function that triggers all the interactivity when a page with comments are loaded.
 * It calls sub-functions to define functionality for fetching async info, and attaching
 * event listeners related to rich UI interaction and form submission.
 *
 * When comment reaction data needs to be fetched and how we make those choices:
 * When no logged in user only need to fetch reaction numbers if there has been recent comment activity.
 * If no recent comments, we do not need the precision of fetching latest counts async. Static value is almost certainly good enough.
 * Always fetch when user is logged in because we need state of whether the user has reacted.
 *
 * @function initializeCommentsPage
 */

function initializeCommentsPage() {
  if (document.getElementById('comments-container')) {
    toggleCodeOfConduct();
    var userStatus = document.body.getAttribute('data-user-status');
    var commentableId = document.getElementById('comments-container').dataset.commentableId;
    var commentableType = document.getElementById('comments-container').dataset.commentableType;
    var hasRecentCommentActivity = document.getElementById('comments-container').dataset.hasRecentCommentActivity;
    commentableIdList = commentableId.split(",");

    if (userStatus === 'logged-in' || hasRecentCommentActivity !== 'false') {
      var f = (function() {
        for (var i = 0; i < commentableIdList.length; i++) {
          (function(i){
            var ajaxReq;
            ajaxReq = new XMLHttpRequest();
            ajaxReq.onreadystatechange = function () {
              if (ajaxReq.readyState === XMLHttpRequest.DONE) {
                var responseObj = JSON.parse(ajaxReq.response);
                var reactions = responseObj.reactions;
                var allNodes = document.getElementsByClassName('single-comment-node');
                var publicReactionCounts = responseObj.public_reaction_counts;
                for (var i = 0; i < reactions.length; i++) {
                  var buttForComment = document.getElementById('button-for-comment-' + reactions[i].reactable_id);
                  if (buttForComment) {
                    buttForComment.classList.add('reacted');
                    buttForComment.setAttribute('aria-pressed', 'true')
                  }
                }
                for (var i = 0; i < publicReactionCounts.length; i++) {
                  var buttForComment = document.getElementById('button-for-comment-' + publicReactionCounts[i].id);
                  if (buttForComment) {
                    var reactionsCountWrapper = buttForComment.querySelector('.reactions-count');
                    var reactionsLabelWrapper = buttForComment.querySelector('.reactions-label');
                    if (publicReactionCounts[i].count > 0) {

                      if (publicReactionCounts[i].count > 1) {
                        reactionsLabelWrapper.innerHTML = `&nbsp;${I18n.t('core.like').toLowerCase()}s`;
                      } else {
                        reactionsLabelWrapper.innerHTML = `&nbsp;${I18n.t('core.like').toLowerCase()}`;
                      }

                      reactionsCountWrapper.id = 'reactions-count-' + publicReactionCounts[i].id;
                      reactionsCountWrapper.innerHTML = publicReactionCounts[i].count;
                      reactionsCountWrapper.classList.remove("hidden");
                    } else {
                      reactionsCountWrapper.classList.add("hidden");
                      reactionsCountWrapper.innerHTML = '0';
                    }

                    if (!buttForComment.classList.contains("reacted")) {
                      buttForComment.setAttribute('aria-pressed', 'false')
                    }
                  }
                }

                for (var i = 0; i < allNodes.length; i++) {
                  if (allNodes[i].dataset.commentAuthorId == responseObj.current_user.id) {
                    allNodes[i].dataset.currentUserComment = "true";
                    var path = allNodes[i].dataset.path;
                    var userActionsEl = allNodes[i].querySelector('.current-user-actions');
                    var buttEl = document.getElementById('button-for-comment-' + allNodes[i].dataset.commentId);
                    if (userActionsEl && buttEl) {
                      userActionsEl.innerHTML = `<li><a href="${ path }/edit" class="crayons-link crayons-link--block" aria-label="Edit this comment">Edit</a></li>
                                                <li><a data-no-instant href="${ path }/delete_confirm" class="edit-butt crayons-link crayons-link--block" aria-label="Delete this comment">Delete</a></li>`
                      userActionsEl.classList.remove('hidden');
                    }
                  }
                }
              }
            };

            ajaxReq.open("GET", "/reactions?commentable_id=" + commentableIdList[i] + "&commentable_type=" + commentableType, true);
            ajaxReq.send();
          })(i);
        }
      })();
    }

    var butts = document.getElementsByClassName('reaction-button');
    for (var i = 0; i < butts.length; i++) {
      var butt = butts[i];
      butt.onclick = function (event) {
        var thisButt = this;
        event.preventDefault();
        sendHapticMessage('medium');
        var userStatus = document.body.getAttribute('data-user-status');
        if (userStatus === 'logged-out') {
          showLoginModal();
          return;
        }

        thisButt.classList.add('reacted');
        thisButt.disabled = true;

        function successCb(response) {
          var reactionCount = thisButt.querySelector('.reactions-count');
          var reactionLabel = thisButt.querySelector('.reactions-label');
          if (response.result === 'create') {
            thisButt.classList.add('reacted');
            thisButt.setAttribute('aria-pressed', 'true');
            if (reactionCount) {
              reactionCount.innerHTML = parseInt(reactionCount.innerHTML) + 1;
              reactionCount.classList.remove("hidden");
              if(parseInt(reactionCount.innerHTML) == 1) {
                reactionLabel.innerHTML = "&nbsp;like"
              } else if(parseInt(reactionCount.innerHTML) > 1) {
                reactionLabel.innerHTML = "&nbsp;likes"
              }
            }
          } else {
            thisButt.classList.remove('reacted');
            thisButt.setAttribute('aria-pressed', 'false');
            if (reactionCount) {
              reactionCount.innerHTML = parseInt(reactionCount.innerHTML) - 1;
              if(parseInt(reactionCount.innerHTML) == 0) {
                reactionCount.classList.add("hidden");
                reactionLabel.innerHTML = "Like"
              }
            }
          }
        }
        var formData = new FormData();
        formData.append('reactable_type', 'Comment');
        formData.append('reactable_id', thisButt.dataset.commentId);
        getCsrfToken()
          .then(sendFetch('reaction-creation', formData))
          .then(function (response) {
            thisButt.disabled = false;
            if (response.status === 200) {
              response.json().then(successCb);
            } else {
              showModalAfterError({
                response,
                element: 'reaction',
                action_ing: 'making',
                action_past: 'made',
              });
            }
          });
      };
    }
    var replyButts = document.getElementsByClassName('toggle-reply-form');
    for (var i = 0; i < replyButts.length; i++) {
      var butt = replyButts[i];
      butt.onclick = function (event) {
        event.preventDefault();
        if (event.target.classList.contains("thread-indication")) {
          return false;
        } else {
          var userStatus = document.body.getAttribute('data-user-status');
          if (userStatus == 'logged-out') {
            showLoginModal();
            return;
          }
          var parentId = event.target.closest('.comment').dataset.commentId;
          var waitingOnCSRF = setInterval(function () {
            var metaTag = document.querySelector("meta[name='csrf-token']");
            if (metaTag) {
              clearInterval(waitingOnCSRF);
              commentWrapper = event.target.closest('.comment__details');
              commentWrapper.classList.add("replying");
              commentWrapper.innerHTML += buildCommentFormHTML(commentableId, commentableType, parentId);
              initializeCommentsPage();

              setTimeout(function () {
                commentWrapper.getElementsByTagName('textarea')[0].focus();
              }, 30);
            }
          }, 1);
        };
        return false;
      }
    }

    if (document.getElementById('new_comment')) {
      document.getElementById('new_comment').addEventListener('submit', handleCommentSubmit);
    }
  }
  listenForDetailsToggle();

  handleHiddenComments(commentableType);
}

function toggleCodeOfConduct() {
  var user = userData();
  if (!user) {
    return;
  }
  var codeOfConduct = user.checked_code_of_conduct
  var checkboxWrapper = document.getElementById('toggle-code-of-conduct-checkbox');
  if (checkboxWrapper && !codeOfConduct) {
    checkboxWrapper.innerHTML = '<input type="checkbox" name="checked_code_of_conduct" class="checkbox" required/>\
                                  <label for="checked_code_of_conduct">I\'ve read the <a href="/code-of-conduct">code of conduct</a></label>'
  }
}

function handleCommentSubmit(event) {
  event.preventDefault();
  var form = event.target;
  form.classList.add('submitting');
  var textarea = form.getElementsByClassName('comment-textarea')[0];
  if (textarea) {
    textarea.style.height = null;
    textarea.blur();
  }
  var parentComment = document.getElementById("comment-node-" + event.target.dataset.commentId);

  // as there can be multiple forms rendered in the comments, we need to use querySelector to find descendants
  var commentParentId = form.querySelector("#comment_parent_id");
  var body = JSON.stringify({
    comment: {
      body_markdown: form.getElementsByTagName("textarea")[0].value,
      commentable_id: form.querySelector("#comment_commentable_id").value,
      commentable_type: form.querySelector("#comment_commentable_type").value,
      parent_id: commentParentId ? commentParentId.value : null,
    }
  });

  getCsrfToken()
    .then(sendFetch('comment-creation', body))
    .then(function (response) {
      if (response.status === 200) {
        response.json().then(function (newComment) {
          var newNode = document.createElement('div');
          newNode.innerHTML = buildCommentHTML(newComment);
          var docBody = document.body

          var userData = JSON.parse(docBody.getAttribute('data-user'))
          userData.checked_code_of_conduct = true;

          docBody.dataset.user = JSON.stringify(userData);

          var checkbox = form.getElementsByClassName('code-of-conduct')[0]
          if (checkbox) {
            checkbox.innerHTML = ""
          }

          var mainCommentsForm = document.getElementById("new_comment");
          if (parentComment) {
            handleFormClose(event);
            if (newComment.depth > 3) {
              var replyTrigger = parentComment.getElementsByClassName("toggle-reply-form")[0];
              var threadIndicator = `<span class="fs-s inline-flex items-center fs-italic color-base-50 pl-1">${ iconSmallThread }Thread</span>`;
              replyTrigger.classList.replace("inline-flex", "hidden");
              replyTrigger.parentNode.innerHTML += threadIndicator;
            }
            var actionsNode = parentComment.getElementsByClassName("comment__inner")[0];
            actionsNode.parentNode.insertBefore(newNode, actionsNode.nextSibling);
          }

          else if (mainCommentsForm) {
            var mainCommentsForm = document.getElementById("new_comment");
            mainCommentsForm.classList.remove("submitting");
            mainCommentsForm.classList.remove('preview-open');

            const commentInputs = [...form.getElementsByClassName("comment-textarea")]
            commentInputs[0].closest('.comment-form').classList.remove('comment-form--initiated');

            // Clearing out all comment textboxes and resetting their height because
            // there is an additional one generated by the comment
            // mention auto-complete component
            commentInputs.forEach(input => {
              input.value = newComment.comment_template || "";
              input.style.height = null;
            });

            const preview = document.getElementById("preview-div");
            const togglePreview = document.querySelector('.preview-toggle');
            preview.innerHTML = "";
            togglePreview.innerHTML = "Preview";
            const container = document.getElementById("comment-trees-container");
            container.insertBefore(newNode, container.firstChild);
          }
          else if (document.getElementById("notifications-container")) {
            var newDiv = document.createElement("span")
            newDiv.innerHTML = '<div class="crayons-notice align-center p-2 m-2 crayons-notice--success reply-sent-notice reply-sent-notice" aria-live="polite">Reply sent — <a href="' + newComment.url + '">Check it out</a></div>'
            form.replaceWith(newDiv);
          }
          else {
            window.location.replace(newComment.url)
          }
          updateCommentsCount();
          initializeCommentsPage();
          initializeCommentDate();
          activateRunkitTags();
        })
      } else {
        form.classList.remove('submitting');
        showModalAfterError({
          response,
          element: 'comment',
          action_ing: 'posting',
          action_past: 'posted',
        });
        return false;
      }
      return false;
    });
  return false;
}

function handleFocus(event) {
  handleButtonsActivation(event);
  var userStatus = document.body.getAttribute('data-user-status');
  var area = event.target;
  if (userStatus == 'logged-out') {
    event.preventDefault();
    showLoginModal();
    area.blur();
  } else {
    var form = event.target.closest(".comment-form");
    if (form) {
      form.classList.add("comment-form--initiated");
    }
    handleSizeChange(event);
    window.Forem.initializeMentionAutocompleteTextArea(area);
  }
}

function handleKeyUp(event) {
  handleSizeChange(event);
  handleButtonsActivation(event);
}

// Handler for when Ctrl+Enter OR Command+Enter is pressed
function handleSubmit(event) {
  // Get user details and extract code of conduct & comment count
  var user = userData();
  if (!user) {
    return;
  }

  var codeOfConduct = user.checked_code_of_conduct;
  if (codeOfConduct && event.target.value.trim() !== '') {
    event.target.closest('form').querySelector('button[type="submit"]').click();
  }
}

// Handler when Ctrl+B/I OR Command+B/I is pressed
function handleBoldAndItalic(event) {
  var textArea = event.target;

  var selection = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
  var selectionStart = textArea.selectionStart;
  var surroundingStr = event.keyCode === KEY_CODE_B ? "**" : "_";

  replaceSelectedText(textArea, `${surroundingStr}${selection}${surroundingStr}`);

  var selectionStartWithOffset = selectionStart + surroundingStr.length;
  textArea.setSelectionRange(selectionStartWithOffset, selectionStartWithOffset + selection.length);
}

// Handler when Ctrl+K OR Command+K is pressed
function handleLink(event) {
  var textArea = event.target;

  var selection = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
  var selectionStart = textArea.selectionStart;

  replaceSelectedText(textArea, `[${selection}](url)`);

  // start position + length of selection + [](
  var startOffset = selectionStart + selection.length + 3;

  // start offset + 'url'.length
  var endOffset = startOffset + 3;

  textArea.setSelectionRange(startOffset, endOffset);
}

function replaceSelectedText(textArea, text) {
  // Chrome and other modern browsers (except FF and IE 8,9,10,11)
  if (document.execCommand('insertText', false, text)) {
  }
  // Firefox (non-standard method)
  else if (typeof textArea.setRangeText === "function") {
    textArea.setRangeText(text);
  }

  /*
    Disabling IE 8-11 for now as there's no easy way to verify all this
    We can revisit this if it's really needed and find a jQuery plugin to use

    // IE 8-10
    else if(document.selection) {
      const ieRange = document.selection.createRange();
      ieRange.text = text;

      // Move cursor after the inserted text
      ieRange.collapse(false); // to the end
      ieRange.select();
    }
    else {
      // Does not support IE 11 yet
    }
  */
}

var KEY_CODE_B = 66;
var KEY_CODE_I = 73;
var KEY_CODE_K = 75;
var ENTER_KEY_CODE = 13;

function handleKeyDown(event) {
  if (Runtime.hasOSSpecificModifier(event)) {
    switch (event.keyCode) {
      case KEY_CODE_B:
        event.preventDefault();
        handleBoldAndItalic(event);
        break;
      case KEY_CODE_I:
        event.preventDefault();
        handleBoldAndItalic(event);
        break;
      case KEY_CODE_K:
        event.preventDefault();
        handleLink(event);
        break;
      case ENTER_KEY_CODE:
        event.preventDefault();
        handleSubmit(event);
        break;
      default:
        break;
    }
  }
}

function handleFormClose(event) {
  event.target.closest('.inner-comment').classList.remove("replying");
  event.target.closest('.comment-form').remove();
  initializeCommentsPage();
}

function handleSizeChange(event) {
  var textarea = event.target;
  var oldHeight = parseInt(textarea.style.height.replace('px',''));
  textarea.style.height = textarea.scrollHeight + (textarea.scrollHeight > oldHeight ? 15 : 0) + "px";
}

function handleButtonsActivation(event) {
  var textarea = event.target;
  var commentForm = textarea.closest('.comment-form');
  if (commentForm) {
    var buttons = textarea.closest('.comment-form').getElementsByClassName('js-btn-enable');
    Array.from(buttons).forEach(function(button) {
      button.disabled = textarea.value.length === 0;
    });
  };
}

function validateField(event) {
  // We only need to validate the textarea that is not the comment mention auto-complete component
  const textArea = event.target.form.querySelector('.comment-textarea:not([role=combobox])');

  if (textArea.value === '') {
    event.preventDefault();
    return;
  }
}

function handleChange(event) {
  handleButtonsActivation(event);
}

function generateUploadFormdata(image) {
  var token = document.querySelector("meta[name='csrf-token']").content;
  var formData = new FormData();
  formData.append('authenticity_token', token);
  formData.append('image', image[0]);
  return formData;
}

function handleImageUpload(event, randomIdNumber) {
  var commentableId = document.getElementById('comments-container').dataset.commentableId;
  event.preventDefault();
  document.getElementById('image-upload-' + randomIdNumber).click();
  document.getElementById('image-upload-' + randomIdNumber).onchange = function (e) {
    var image = document.getElementById('image-upload-' + randomIdNumber).files;
    if (image.length > 0) {
      document.getElementById("image-upload-file-label-" + randomIdNumber).style.color = '#888888';
      document.getElementById("image-upload-file-label-" + randomIdNumber).innerHTML = "Uploading...";
      document.getElementById("image-upload-submit-" + randomIdNumber).value = "uploading";
      setTimeout(function () {
        document.getElementById("image-upload-submit-" + randomIdNumber).click(function () { });
      }, 50)
    }
  }

  document.getElementById("image-upload-submit-" + randomIdNumber).onclick = function (e) {
    e.preventDefault();
    var image = document.getElementById('image-upload-' + randomIdNumber).files;
    if (image.length > 0) {
      getCsrfToken()
        .then(sendFetch("image-upload", generateUploadFormdata(image)))
        .then(function (response) {
          if (response.status === 200) {
            response.json().then(
              function uploadImageCb(json) {
                var address = document.getElementById("uploaded-image-" + randomIdNumber);
                var button = document.getElementById("image-upload-button-" + randomIdNumber);
                var messageContainer = document.getElementById("image-upload-file-label-" + randomIdNumber)
                // button.style.display = "none";
                messageContainer.style.display = "none";
                address.value = json.links[0];
                address.classList.remove("hidden");;
                address.select();

                var uploadedMessage = 'Uploaded! Paste into editor';
                messageContainer.innerHTML = uploadedMessage;
                messageContainer.style.color = '#00c673';
                messageContainer.style.position = "relative";
                messageContainer.style.top = "5px";
              }
            );
          } else if (response.status === 429) {
            showRateLimitModal({
              response,
              element: 'image',
              action_ing: 'uploading',
              action_past: 'uploaded',
            });
          } else {
            response.json().then(function(responseBody) {
              var errorMessage = responseBody.error || 'Invalid file!';
              document.getElementById("image-upload-file-label-" + randomIdNumber).innerHTML = errorMessage;
              document.getElementById("image-upload-file-label-" + randomIdNumber).style.color = '#e05252';
              document.getElementById("image-upload-submit-" + randomIdNumber).style.display = 'none';
            });
          }
        })
        .catch(function (err) {
          // there's currently no error handling
        })
    }
  }
}

function updateItemSummaryHtml(item) {
  var itemSummaryContent = item.getElementsByClassName("js-collapse-comment-content")[0];
  var usernames = item.getElementsByClassName("js-comment-username");
  var number = "";
  if (usernames.length > 1) {
    number = " + " + (usernames.length - 1) + " replies"
  }
  var itemUsername = usernames[0].textContent + number
  if (item.open) {
    itemSummaryContent.innerHTML = "";
  } else {
    itemSummaryContent.innerHTML = itemUsername;
  }
}

function listenForDetailsToggle() {
  var detailItems = document.querySelectorAll(".js-comment-wrapper");
  for (var i = 0; i < detailItems.length; i++) {
    detailItems[i].addEventListener("toggle", event => {
      var item = event.target;
      updateItemSummaryHtml(item);
    });
  }
}

/**
 * Increment comment, stored in `.js-comments-count`, count by one.
 */
function updateCommentsCount() {
  const commentsCountDiv = document.querySelector(".js-comments-count");

  // if there's nowhere to put the count return early.
  if(!commentsCountDiv) return;

  const commentsCountData = parseInt(commentsCountDiv.dataset.commentsCount, 10) + 1;
  commentsCountDiv.dataset.commentsCount = commentsCountData;
  commentsCountDiv.innerHTML = `(${commentsCountData})`
}

function handleHiddenComments(commentableType){
  const currentUser = userData();
  const commentableAuthorIds = [];
  let coAuthorIds = '';
  if(commentableType === "Article"){
    const articleContainer = document.querySelector('#article-show-container');
    if(articleContainer){
      if (articleContainer.dataset) {
        commentableAuthorIds.push(articleContainer.dataset.authorId);
        coAuthorIds = articleContainer.dataset.coAuthorIds;
        if(coAuthorIds){
          coAuthorIds.split(',').forEach(coAuthorId => {
            commentableAuthorIds.push(coAuthorId);
          });
        }
      }
    }
    else {
      const commentsContainer = document.querySelector('#comments-container');
      if(commentsContainer){
        if(commentsContainer.dataset) {
          commentableAuthorIds.push(commentsContainer.dataset.commentableAuthorId);
          coAuthorIds = commentsContainer.dataset.commentableCoAuthorIds;
          if(coAuthorIds){
            coAuthorIds.split(',').forEach(coAuthorId => {
              commentableAuthorIds.push(coAuthorId);
            });
          }
        }
      }
    }
  } else if(commentableType === "PodcastEpisode"){
    const podCastEpisodeContainer = document.querySelector('.podcast-episode-container');
    if(podCastEpisodeContainer){
      commentableAuthorIds.push(podCastEpisodeContainer.dataset.creatorId);
    }
  }
  if(currentUser && commentableAuthorIds.includes(currentUser.id.toString())){
    collapseCommentsHiddenByCommentableUser();
  }
  else {
    document.querySelectorAll('.element-hidden-by-commentable-user').forEach(element => {
      element.classList.add('hidden');
    })
    document.querySelectorAll('.comment-hidden-by-author-text').forEach(element => {
      element.classList.remove('hidden');
    })
  }
}

function collapseCommentsHiddenByCommentableUser() {
  document.querySelectorAll(".js-comment-wrapper.details-comment-hidden-by-commentable-user").forEach(item => {
    if (item.querySelectorAll('.comment-form').length === 0){
      item.open = false;
      updateItemSummaryHtml(item);
    }
  })
};
/* global localizeTimeElements */

'use strict';

function initializeCreditsPage() {
  const datetimes = document.querySelectorAll('.ledger time');

  localizeTimeElements(datetimes, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
/* global InstantClick */

'use strict';

function selectNavigation(select, urlPrefix) {
  const trigger = document.getElementById(select);

  if (trigger) {
    trigger.addEventListener('change', (event) => {
      let url = event.target.value;
      if (urlPrefix) {
        url = urlPrefix + url;
      }

      InstantClick.preload(url);
      InstantClick.display(url);
    });
  }
}

function initializeDashboardSort() {
  selectNavigation('dashboard_sort', '/dashboard?sort=');
  selectNavigation('dashboard_author');
  selectNavigation('mobile_nav_dashboard');
};
/* global localizeTimeElements */

'use strict';

function initializeDateHelpers() {
  // Date without year: Jul 12
  localizeTimeElements(document.querySelectorAll('time.date-no-year'), {
    month: 'short',
    day: 'numeric',
  });

  // Full date: Jul 12, 2020
  localizeTimeElements(document.querySelectorAll('time.date'), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
/* global InstantClick, slideSidebar */

function initializeDrawerSliders() {
  if (document.getElementById('on-page-nav-controls')) {
    if (document.getElementById('sidebar-bg-left')) {
      document.getElementById('sidebar-bg-left').onclick = (_event) => {
        slideSidebar('left', 'outOfView');
      };
    }
    if (document.getElementById('sidebar-bg-right')) {
      document.getElementById('sidebar-bg-right').onclick = (_event) => {
        slideSidebar('right', 'outOfView');
      };
    }

    if (document.getElementById('on-page-nav-butt-left')) {
      document.getElementById('on-page-nav-butt-left').onclick = (_event) => {
        slideSidebar('left', 'intoView');
      };
    }
    if (document.getElementById('on-page-nav-butt-right')) {
      document.getElementById('on-page-nav-butt-right').onclick = (_event) => {
        slideSidebar('right', 'intoView');
      };
    }
    InstantClick.on('change', (_event) => {
      document.body.classList.remove('modal-open');
      slideSidebar('right', 'outOfView');
      slideSidebar('left', 'outOfView');
    });
  }

  const feedFilterSelect = document.getElementById('feed-filter-select');

  if (feedFilterSelect) {
    feedFilterSelect.addEventListener('change', (event) => {
      const url = event.target.value;

      InstantClick.preload(url);
      InstantClick.display(url);
    });
  }
};
'use strict';

function initializeHeroBannerClose() {
  let bannerWrapper = document.getElementById('hero-html-wrapper');
  let closeIcon = document.getElementById('js-hero-banner__x');

  // Currently js-hero-banner__x button icon ID needs to be written into the abstract html
  // In the future this could be extracted so the implementer doesn't need to worry about it.

  if (bannerWrapper && closeIcon) {
    closeIcon.setAttribute('aria-label', 'Close campaign banner');
    closeIcon.addEventListener('click', () => {
      localStorage.setItem('exited_hero', bannerWrapper.dataset.name);
      bannerWrapper.style.display = 'none';
    });
  }
};
function initializeLocalStorageRender() {
  try {
    var userData = browserStoreCache('get');
    if (userData) {
      document.body.dataset.user = userData;
      initializeBaseUserData();
      initializeReadingListIcons();
      initializeSponsorshipVisibility();
    }
  } catch (err) {
    browserStoreCache('remove');
  }
};
/**
 * This script looks for the onboarding task card, which is hidden by default,
 * and displays it if the user is created less than a week ago and hasn't closed
 * the task card yet.
 */

function initializeOnboardingTaskCard() {
  if (localStorage.getItem('task-card-closed') === 'yes') {
    return;
  }

  var taskCard = document.getElementsByClassName('onboarding-task-card')[0];
  const user = userData();
  if (taskCard == null || !user) {
    return; // Guard against a null/undefined taskCard, and no user data.
  }

  var createdAt = new Date(user.created_at);
  var now = new Date();
  var aWeekAgo = now.setDate(now.getDate() - 7);

  if (createdAt > aWeekAgo) {
    taskCard.style.display = 'block';
  }
};
function initializePaymentPointers() {
  var userPointer = document.getElementById('author-payment-pointer');
  var basePointer = document.getElementById('base-payment-pointer');
  var meta = document.querySelector("meta[name='monetization']");

  if (userPointer && meta) {
    meta.content = userPointer.dataset.paymentPointer;
  } else if (basePointer) {
    meta.content = basePointer.dataset.paymentPointer;
  }
};
/**
 * This script hunts for podcast's "Record" for both the podcast_episode's
 * show page and an article page containing podcast liquid tag. It handles
 * playback and makes sure the record will spin when the podcast is currently
 * playing.
 *
 * The media is initialized (once) and the "state" is stored using localStorage.
 * When playback is the website's responsability it's run using the `audio` HTML
 * element. The iOS app uses a bridging strategy that sends messages using
 * webkit messageHandlers and receives incoming messages through the
 * `contentaudio` element, which allows for native audio playback.
 *
 * The high level functions are the following:
 * - spinPodcastRecord()
 * - findAndApplyOnclickToRecords()
 * - initializeMedia()
 * - currentAudioState()
 * - saveMediaState()
 *
 * The following are useful eslint disables for this file in particular. Because
 * of the way it's wrapped around its own function (own context) we don't have
 * the problem of using a method before it's defined:
 */

/* global ahoy, Runtime */
/* eslint no-use-before-define: 0 */
/* eslint no-param-reassign: 0 */

var audioInitialized = false;

function initializePodcastPlayback() {
  var deviceType = 'web';

  function getById(name) {
    return document.getElementById(name);
  }

  function getByClass(name) {
    return document.getElementsByClassName(name);
  }

  function newAudioState() {
    if (!window.name) {
      window.name = Math.random();
    }
    return {
      html: getById('audiocontent').innerHTML,
      currentTime: 0,
      playing: false,
      muted: false,
      volume: 1,
      duration: 1,
      updated: new Date().getTime(),
      windowName: window.name,
    };
  }

  function currentAudioState() {
    try {
      var currentState = JSON.parse(
        localStorage.getItem('media_playback_state_v2'),
      );
      if (!currentState || window.name !== currentState.windowName) {
        return newAudioState();
      }
      return currentState;
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
      return newAudioState();
    }
  }

  function audioExistAndIsPlaying() {
    var audio = getById('audio');
    var currentState = currentAudioState();
    return audio && currentState.playing;
  }

  function recordExist() {
    return getById(`record-${window.activeEpisode}`);
  }

  function spinPodcastRecord(customMessage) {
    if (audioExistAndIsPlaying() && recordExist()) {
      var podcastPlaybackButton = getById(`record-${window.activeEpisode}`);
      podcastPlaybackButton.classList.add('playing');
      podcastPlaybackButton.setAttribute('aria-pressed', 'true');
      changeStatusMessage(customMessage);
    }
  }

  function stopRotatingActivePodcastIfExist() {
    if (window.activeEpisode && getById(`record-${window.activeEpisode}`)) {
      var podcastPlaybackButton = getById(`record-${window.activeEpisode}`);
      podcastPlaybackButton.classList.remove('playing');
      podcastPlaybackButton.setAttribute('aria-pressed', 'false');
      window.activeEpisode = undefined;
    }
  }

  function findRecords() {
    var podcastPageRecords = getByClass('record-wrapper');
    var podcastLiquidTagrecords = getByClass('podcastliquidtag__record');
    if (podcastPageRecords.length > 0) {
      return podcastPageRecords;
    }
    return podcastLiquidTagrecords;
  }

  function saveMediaState(state) {
    var currentState = state || currentAudioState();
    var newState = newAudioState();
    newState.currentTime = currentState.currentTime;
    newState.playing = currentState.playing;
    newState.muted = currentState.muted;
    newState.volume = currentState.volume;
    newState.duration = currentState.duration;
    localStorage.setItem('media_playback_state_v2', JSON.stringify(newState));
    return newState;
  }

  function applyOnclickToPodcastBar(audio) {
    var currentState = currentAudioState();
    getById('barPlayPause').onclick = function () {
      playPause(audio);
    };
    getById('mutebutt').onclick = function () {
      muteUnmute(audio);
    };
    getById('volbutt').onclick = function () {
      muteUnmute(audio);
    };
    getById('bufferwrapper').onclick = function (e) {
      goToTime(e, audio);
    };
    getById('volumeslider').value = currentState.volume * 100;
    getById('volumeslider').onchange = function (e) {
      updateVolume(e, audio);
    };
    getById('speed').onclick = function () {
      changePlaybackRate(audio);
    };
    getById('closebutt').onclick = function () {
      terminatePodcastBar(audio);
    };
  }

  function podcastBarAlreadyExistAndPlayingTargetEpisode(episodeSlug) {
    return getById('audiocontent').innerHTML.indexOf(`${episodeSlug}`) !== -1;
  }

  function updateProgressListener(audio) {
    return function (e) {
      var bufferValue = 0;
      if (audio.currentTime > 0) {
        var bufferEnd = audio.buffered.end(audio.buffered.length - 1);
        bufferValue = (bufferEnd / audio.duration) * 100;
      }
      updateProgress(audio.currentTime, audio.duration, bufferValue);
    };
  }

  function loadAudio(audio) {
    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({
        action: 'load',
        url: audio.getElementsByTagName('source')[0].src,
      });
    } else {
      audio.load();
    }
  }

  function loadAndPlayNewPodcast(episodeSlug) {
    getById('audiocontent').innerHTML = getById(
      `hidden-audio-${episodeSlug}`,
    ).innerHTML;
    var audio = getById('audio');
    audio.addEventListener('timeupdate', updateProgressListener(audio), false);
    loadAudio(audio);
    playPause(audio);
    applyOnclickToPodcastBar(audio);
  }

  function findAndApplyOnclickToRecords() {
    var records = findRecords();
    Array.prototype.forEach.call(records, function (record) {
      var episodeSlug = record.getAttribute('data-episode');
      var podcastSlug = record.getAttribute('data-podcast');

      var togglePodcastState = function (e) {
        if (podcastBarAlreadyExistAndPlayingTargetEpisode(episodeSlug)) {
          var audio = getById('audio');
          if (audio) {
            playPause(audio);
          }
        } else {
          stopRotatingActivePodcastIfExist();
          loadAndPlayNewPodcast(episodeSlug);
        }
      };
      record.addEventListener('click', togglePodcastState);
    });
  }

  function changePlaybackRate(audio) {
    var currentState = currentAudioState();
    var el = getById('speed');
    var speed = parseFloat(el.getAttribute('data-speed'));
    if (speed === 2) {
      el.setAttribute('data-speed', 0.5);
      el.innerHTML = '0.5x';
      currentState.playbackRate = 0.5;
    } else {
      el.setAttribute('data-speed', speed + 0.5);
      el.innerHTML = speed + 0.5 + 'x';
      currentState.playbackRate = speed + 0.5;
    }
    saveMediaState(currentState);

    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({
        action: 'rate',
        rate: currentState.playbackRate.toString(),
      });
    } else {
      audio.playbackRate = currentState.playbackRate;
    }
  }

  function changeStatusMessage(message) {
    var statusBox = getById(`status-message-${window.activeEpisode}`);
    if (statusBox) {
      if (message) {
        statusBox.classList.add('showing');
        statusBox.innerHTML = message;
      } else {
        statusBox.classList.remove('showing');
      }
    } else if (
      message === 'initializing...' &&
      getByClass('status-message')[0]
    ) {
      getByClass('status-message')[0].innerHTML = message;
    }
  }

  function startPodcastBar() {
    getById('barPlayPause').classList.add('playing');
    getById('progressBar').classList.add('playing');
    getById('animated-bars').classList.add('playing');
  }

  function pausePodcastBar() {
    getById('barPlayPause').classList.remove('playing');
    getById('animated-bars').classList.remove('playing');
  }

  function playAudio(audio) {
    return new Promise(function (resolve, reject) {
      var currentState = currentAudioState();
      if (Runtime.podcastMessage) {
        Runtime.podcastMessage({
          action: 'play',
          url: audio.getElementsByTagName('source')[0].src,
          seconds: currentState.currentTime.toString(),
        });
        setPlaying(true);
        resolve();
      } else {
        audio.currentTime = currentState.currentTime;
        audio
          .play()
          .then(function () {
            setPlaying(true);
            resolve();
          })
          .catch(function (error) {
            console.log(error); // eslint-disable-line no-console
            setPlaying(false);
            reject();
          });
      }
    });
  }

  function fetchMetadataString() {
    var episodeContainer = getByClass('podcast-episode-container')[0];
    if (episodeContainer === undefined) {
      episodeContainer = getByClass('podcastliquidtag')[0];
    }
    return episodeContainer.dataset.meta;
  }

  function sendMetadataMessage() {
    if (Runtime.podcastMessage) {
      try {
        var metadata = JSON.parse(fetchMetadataString());
        Runtime.podcastMessage({
          action: 'metadata',
          episodeName: metadata.episodeName,
          podcastName: metadata.podcastName,
          podcastImageUrl: metadata.podcastImageUrl,
        });
      } catch (e) {
        console.log('Unable to load Podcast Episode metadata', e); // eslint-disable-line no-console
      }
    }
  }

  function startAudioPlayback(audio) {
    sendMetadataMessage();

    playAudio(audio)
      .then(function () {
        spinPodcastRecord();
        startPodcastBar();
      })
      .catch(function (error) {
        playAudio(audio);
        setTimeout(function () {
          spinPodcastRecord('initializing...');
          startPodcastBar();
        }, 5);
      });
  }

  function pauseAudioPlayback(audio) {
    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({ action: 'pause' });
    } else {
      audio.pause();
    }
    setPlaying(false);
    stopRotatingActivePodcastIfExist();
    pausePodcastBar();
  }

  function ahoyMessage(action) {
    window.activeEpisode = audio.getAttribute('data-episode');
    window.activePodcast = audio.getAttribute('data-podcast');

    var properties = {
      action: action,
      episode: window.activeEpisode,
      podcast: window.activePodcast,
      deviceType: deviceType,
    };
    ahoy.track('Podcast Player Streaming', properties);
  }

  function playPause(audio) {
    var currentState = currentAudioState();
    if (!currentState.playing) {
      ahoyMessage('play');
      changeStatusMessage('initializing...');
      startAudioPlayback(audio);
    } else {
      ahoyMessage('pause');
      pauseAudioPlayback(audio);
      changeStatusMessage(null);
    }
  }

  function muteUnmute(audio) {
    var currentState = currentAudioState();
    getById('mutebutt').classList.add(
      currentState.muted ? 'hidden' : 'showing',
    );
    getById('volumeindicator').classList.add(
      currentState.muted ? 'showing' : 'hidden',
    );
    getById('mutebutt').classList.remove(
      currentState.muted ? 'showing' : 'hidden',
    );
    getById('volumeindicator').classList.remove(
      currentState.muted ? 'hidden' : 'showing',
    );

    currentState.muted = !currentState.muted;
    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({
        action: 'muted',
        muted: currentState.muted.toString(),
      });
    } else {
      audio.muted = currentState.muted;
    }
    saveMediaState(currentState);
  }

  function updateVolume(e, audio) {
    var currentState = currentAudioState();
    currentState.volume = e.target.value / 100;
    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({ action: 'volume', volume: currentState.volume });
    } else {
      audio.volume = currentState.volume;
    }
    saveMediaState(currentState);
  }

  function updateProgress(currentTime, duration, bufferValue) {
    var progress = getById('progress');
    var buffer = getById('buffer');
    var time = getById('time');
    var value = 0;
    var firstDecimal = currentTime - Math.floor(currentTime);
    if (currentTime > 0) {
      value = Math.floor((100.0 / duration) * currentTime);
      if (firstDecimal < 0.4) {
        // Rewrite to mediaState storage every few beats.
        var currentState = currentAudioState();
        currentState.duration = duration;
        currentState.currentTime = currentTime;
        saveMediaState(currentState);
      }
    }
    if (progress && time && currentTime > 0) {
      progress.style.width = value + '%';
      buffer.style.width = bufferValue + '%';
      time.innerHTML =
        readableDuration(currentTime) + ' / ' + readableDuration(duration);
    }
  }

  function goToTime(e, audio) {
    var currentState = currentAudioState();
    var progress = getById('progress');
    var time = getById('time');
    if (e.clientX > 128) {
      var percent = (e.clientX - 128) / (window.innerWidth - 133);
      var duration = currentState.duration;
      currentState.currentTime = duration * percent; // jumps to 29th secs

      if (Runtime.podcastMessage) {
        Runtime.podcastMessage({
          action: 'seek',
          seconds: currentState.currentTime.toString(),
        });
      } else {
        audio.currentTime = currentState.currentTime;
      }

      time.innerHTML =
        readableDuration(currentState.currentTime) +
        ' / ' +
        readableDuration(currentState.duration);
      progress.style.width = percent * 100.0 + '%';
    }
  }

  function readableDuration(seconds) {
    var sec = Math.floor(seconds);
    var min = Math.floor(sec / 60);
    min = min >= 10 ? min : '0' + min;
    sec = Math.floor(sec % 60);
    sec = sec >= 10 ? sec : '0' + sec;
    return min + ':' + sec;
  }

  function terminatePodcastBar(audio) {
    audio.removeEventListener(
      'timeupdate',
      updateProgressListener(audio),
      false,
    );
    getById('audiocontent').innerHTML = '';
    stopRotatingActivePodcastIfExist();
    saveMediaState(newAudioState());
    if (Runtime.podcastMessage) {
      Runtime.podcastMessage({ action: 'terminate' });
    }
  }

  function handlePodcastMessages(event) {
    const message = JSON.parse(event.detail);
    if (message.namespace !== 'podcast') {
      return;
    }

    var currentState = currentAudioState();
    switch (message.action) {
      case 'init':
        getById('time').innerHTML = 'initializing...';
        currentState.currentTime = 0;
        break;
      case 'tick':
        currentState.currentTime = message.currentTime;
        currentState.duration = message.duration;
        updateProgress(currentState.currentTime, currentState.duration, 100);
        break;
      default:
        console.log('Unrecognized message: ', message); // eslint-disable-line no-console
    }

    saveMediaState(currentState);
  }

  // When Runtime.podcastMessage is undefined we need to execute web logic
  function initRuntime() {
    if (Runtime.isNativeIOS('podcast')) {
      deviceType = 'iOS';
    } else if (Runtime.isNativeAndroid('podcastMessage')) {
      deviceType = 'Android';
    }

    if (deviceType !== 'web') {
      Runtime.podcastMessage = (msg) => {
        window.ForemMobile.injectNativeMessage('podcast', msg);
      };
    }
  }

  function initializeMedia() {
    var currentState = currentAudioState();
    document.getElementById('audiocontent').innerHTML = currentState.html;
    var audio = getById('audio');
    if (audio === undefined || audio === null) {
      audioInitialized = false;
      return;
    }
    if (Runtime.podcastMessage) {
      audio.currentTime = currentState.currentTime || 0;
    }
    loadAudio(audio);
    if (currentState.playing) {
      playAudio(audio).catch(function (error) {
        pausePodcastBar();
      });
    }
    setTimeout(function () {
      audio.addEventListener(
        'timeupdate',
        updateProgressListener(audio),
        false,
      );
      document.addEventListener('ForemMobile', handlePodcastMessages);
    }, 500);
    applyOnclickToPodcastBar(audio);
  }

  function setPlaying(playing) {
    var currentState = currentAudioState();
    currentState.playing = playing;
    saveMediaState(currentState);
  }

  initRuntime();
  spinPodcastRecord();
  findAndApplyOnclickToRecords();
  if (!audioInitialized) {
    audioInitialized = true;
    initializeMedia();
  }
  var audio = getById('audio');
  var audioContent = getById('audiocontent');
  if (audio && audioContent && audioContent.innerHTML.length < 25) {
    // audio not already loaded
    loadAudio(audio);
  }
};
/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
/* eslint-disable func-names */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */

function initializeReadingListIcons() {
  setReadingListButtonsState();
  addReadingListCountToHomePage();
  addHoverEffectToReadingListButtons();
}

// set SAVE or SAVED articles buttons
function setReadingListButtonsState() {
  var readingListButtons = document.querySelectorAll(
    '.bookmark-button:not([data-initial-feed])',
  );
  Array.from(readingListButtons).forEach(highlightButton);
}

// private

function highlightButton(button) {
  var user = userData();
  var buttonIdInt = parseInt(button.dataset.reactableId, 10);
  if (user && user.reading_list_ids.indexOf(buttonIdInt) > -1) {
    button.classList.add('selected');
  } else {
    button.classList.remove('selected');
  }
  button.addEventListener('click', reactToReadingListButtonClick);
  button.dataset.saveInitialized = true;
}

function addReadingListCountToHomePage() {
  var user = userData();
  var readingListCount;
  if (user && document.getElementById('reading-list-count')) {
    readingListCount =
      user.reading_list_ids.length > 0 ? user.reading_list_ids.length : '';
    document.getElementById('reading-list-count').innerHTML = readingListCount;
    document.getElementById('reading-list-count').dataset.count =
      user.reading_list_ids.length;
  }
}

function reactToReadingListButtonClick(event) {
  var button;
  var userStatus;
  event.preventDefault();
  sendHapticMessage('medium');
  userStatus = document.body.getAttribute('data-user-status');
  if (userStatus === 'logged-out') {
    showLoginModal();
    return;
  }
  button = properButtonFromEvent(event);
  renderOptimisticResult(button);
  getCsrfToken()
    .then(sendFetch('reaction-creation', buttonFormData(button)))
    .then(function (response) {
      if (response.status === 200) {
        return response.json().then(function (json) {
          renderButtonState(button, json);
          renderNewSidebarCount(button, json);
        });
      } // else {
      // there's currently no errorCb.
      // }
    })
    .catch(function (error) {
      // there's currently no error handling.
    });
}

function renderButtonState(button, json) {
  if (json.result === 'create') {
    button.classList.add('selected');
    addHoverEffectToReadingListButtons(button);
  } else {
    button.classList.remove('selected');
  }
}

function renderNewSidebarCount(button, json) {
  var newCount;
  var count = document.getElementById('reading-list-count').dataset.count;
  count = parseInt(count, 10);
  if (json.result === 'create') {
    newCount = count + 1;
  } else if (count !== 0) {
    newCount = count - 1;
  }
  document.getElementById('reading-list-count').dataset.count = newCount;
  document.getElementById('reading-list-count').innerHTML =
    newCount > 0 ? newCount : '';
}

function buttonFormData(button) {
  var formData = new FormData();
  formData.append('reactable_type', 'Article');
  formData.append('reactable_id', button.dataset.reactableId);
  formData.append('category', 'readinglist');
  return formData;
}

function renderOptimisticResult(button) {
  renderButtonState(button, { result: 'create' }); // optimistic create only for now
}

function properButtonFromEvent(event) {
  var properElement;
  if (event.target.tagName === 'BUTTON') {
    properElement = event.target;
  } else {
    properElement = event.target.parentElement;
  }
  return properElement;
}

/*
  Add the hover effect to reading list buttons.

  This function makes use of mouseover/mouseevent bubbling behaviors to attach
  only two event handlers to the articles container for performance reasons.
*/
function addHoverEffectToReadingListButtons() {
  var articlesList = document.getElementsByClassName('articles-list');
  Array.from(articlesList).forEach(function (container) {
    // we use `bind` so that the event handler will have the correct text in its
    // `this` local variable
    container.addEventListener(
      'mouseover',
      readingListButtonMouseHandler.bind('Unsave'),
    );
    container.addEventListener(
      'mouseout',
      readingListButtonMouseHandler.bind('Saved'),
    );
  });
}

/*
  Determines if the element is the target of the reading list button hover.
*/
function isReadingListButtonHoverTarget(element) {
  var classList = element.classList;

  return (
    (element.tagName === 'BUTTON' &&
      classList.contains('bookmark-button') &&
      classList.contains('selected')) ||
    (element.tagName === 'SPAN' && classList.contains('bm-success'))
  );
}

function readingListButtonMouseHandler(event) {
  var target = event.target;

  if (isReadingListButtonHoverTarget(target)) {
    event.preventDefault();

    var textReplacement = this; // `this` is the text to be replaced
    var textSpan;
    if (target.tagName === 'BUTTON') {
      textSpan = target.getElementsByClassName('bm-success')[0];
    } else {
      textSpan = target;
    }

    textSpan.innerHTML = textReplacement;
  }
}

/* eslint-enable no-use-before-define */
/* eslint-enable no-undef */
/* eslint-enable func-names */
/* eslint-enable consistent-return */
/* eslint-enable no-unused-vars */;
/* global timestampToLocalDateTime InstantClick Runtime */

function initializeSettings() {
  // initialize org secret copy to clipboard functionality
  const settingsOrgSecretInput = document.getElementById('settings-org-secret');
  const settingsOrgSecretButton = document.getElementById(
    'settings-org-secret-copy-btn',
  );

  if (settingsOrgSecretInput && settingsOrgSecretButton) {
    settingsOrgSecretButton.addEventListener('click', () => {
      const { value } = settingsOrgSecretInput;
      Runtime.copyToClipboard(value).then(() => {
        // Show the confirmation message
        document
          .getElementById('copy-text-announcer')
          .classList.remove('hidden');
      });
    });
  }

  // shows RSS fetch time in local time
  let timeNode = document.getElementById('rss-fetch-time');
  if (timeNode) {
    var timeStamp = timeNode.getAttribute('datetime');
    var timeOptions = {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };

    timeNode.textContent = timestampToLocalDateTime(
      timeStamp,
      navigator.language,
      timeOptions,
    );
  }

  const mobilePageSelector = document.getElementById('mobile-page-selector');

  if (mobilePageSelector) {
    mobilePageSelector.addEventListener('change', (event) => {
      const url = event.target.value;

      InstantClick.preload(url);
      InstantClick.display(url);
    });
  }
};
/*
 * kept as a stand function so it can be loaded again without issue
 * see: https://github.com/thepracticaldev/dev.to/issues/6468
 */
function sponsorClickHandler(event) {
  ga(
    'send',
    'event',
    'click',
    'click sponsor link',
    event.target.dataset.details,
    null,
  );
}

function listenForSponsorClick() {
  setTimeout(() => {
    if (window.ga) {
      var links = document.getElementsByClassName('partner-link');
      // eslint-disable-next-line no-plusplus
      for (var i = 0; i < links.length; i++) {
        links[i].onclick = sponsorClickHandler;
      }
    }
  }, 400);
}

function initializeSponsorshipVisibility() {
  var el =
    document.getElementById('sponsorship-widget') ||
    document.getElementById('partner-content-display');
  var user = userData();
  if (el) {
    setTimeout(() => {
      if (window.ga) {
        if (document.querySelectorAll('[data-partner-seen]').length === 0) {
          ga(
            'send',
            'event',
            'view',
            'sponsor displayed on page',
            el.dataset.details,
            null,
          );
          el.dataset.partnerSeen = 'true';
        }
      }
    }, 400);
  }
  if (el && user && user.display_sponsors) {
    el.classList.remove('hidden');
    listenForSponsorClick();
  } else if (el && user) {
    el.classList.add('hidden');
  } else if (el) {
    el.classList.remove('hidden');
    listenForSponsorClick();
  }
};
'use strict';

function formatDateTime(options, value) {
  return new Intl.DateTimeFormat('en-US', options).format(value);
}

function convertUtcTime(utcTime) {
  var time = new Date(utcTime);
  var options = {
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  };
  return formatDateTime(options, time);
}

function convertUtcDate(utcDate) {
  var date = new Date(utcDate);
  var options = {
    month: 'short',
    day: 'numeric',
  };
  return formatDateTime(options, date);
}

function convertCalEvent(utc) {
  var date = new Date(utc);
  var options = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  };

  return formatDateTime(options, date);
}

function updateLocalDateTime(elements, convertCallback, getUtcDateTime) {
  var local;
  for (var i = 0; i < elements.length; i += 1) {
    local = convertCallback(getUtcDateTime(elements[i]));
    // eslint-disable-next-line no-param-reassign
    elements[i].innerHTML = local;
  }
}

function initializeTimeFixer() {
  var utcTime = document.getElementsByClassName('utc-time');
  var utcDate = document.getElementsByClassName('utc-date');
  var utc = document.getElementsByClassName('utc');

  if (!utc) {
    return;
  }

  updateLocalDateTime(
    utcTime,
    convertUtcTime,
    (element) => element.dataset.datetime,
  );
  updateLocalDateTime(
    utcDate,
    convertUtcDate,
    (element) => element.dataset.datetime,
  );
  updateLocalDateTime(utc, convertCalEvent, (element) => element.innerHTML);
};
'use strict';

function initializeProfileInfoToggle() {
  const infoPanels = document.getElementsByClassName('js-user-info')[0];
  const trigger = document.getElementsByClassName('js-user-info-trigger')[0];
  const triggerWrapper = document.getElementsByClassName(
    'js-user-info-trigger-wrapper',
  )[0];

  if (trigger && infoPanels) {
    trigger.addEventListener('click', () => {
      triggerWrapper.classList.replace('block', 'hidden');
      infoPanels.classList.replace('hidden', 'grid');
    });
  }
}

function initializeProfileBadgesToggle() {
  const badgesWrapper = document.getElementsByClassName('js-profile-badges')[0];
  const trigger = document.getElementsByClassName(
    'js-profile-badges-trigger',
  )[0];

  if (badgesWrapper && trigger) {
    const badges = badgesWrapper.querySelectorAll('.js-profile-badge.hidden');
    trigger.addEventListener('click', () => {
      badges.forEach((badge) => {
        badge.classList.remove('hidden');
      });

      trigger.classList.add('hidden');
    });
  }
};
/**
 * This script hunts for video tags and initializes the correct player
 * depending on the platform:
 * - web: jwplayer
 * - iOS/Android: Native player
 *
 * Once jwplayer is initialized there's no follow up actions to be taken.
 * Mobile Native players send back information into the DOM in order to
 * interact and update the UI, therefore a MutationObserver is registered.
 */

/* eslint no-use-before-define: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-useless-escape: 0 */
/* global jwplayer, ahoy, Runtime */

function initializeVideoPlayback() {
  var currentTime = '0';
  var deviceType = 'web';
  var lastEvent = '';

  function getById(name) {
    return document.getElementById(name);
  }

  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  function timeToSeconds(hms) {
    var a;
    if (hms.length < 3) {
      return hms;
    } else if (hms.length < 6) {
      a = hms.split(':');
      return (hms = +a[0] * 60 + +a[1]);
    } else {
      a = hms.split(':');
      return (hms = +a[0] * 60 * 60 + +a[1] * 60 + +a[2]);
    }
  }

  function videoPlayerEvent(isPlaying) {
    // jwtplayer tends to send multiple 'play' actions. This check makes sure
    // we're not tracking repeated 'play' events for a single interaction.
    var eventName = isPlaying ? 'play' : 'pause';
    if (lastEvent === eventName) {
      return;
    }
    lastEvent = eventName;

    var metadata = videoMetadata(getById('video-player-source'));
    var properties = {
      article: metadata.id,
      deviceType: deviceType,
      action: eventName,
    };
    ahoy.track('Video Player Streaming', properties);
  }

  function initWebPlayer(seconds, metadata) {
    var waitingOnJWP = setInterval(function () {
      if (typeof jwplayer !== 'undefined') {
        clearInterval(waitingOnJWP);
        var playerInstance = jwplayer(`video-player-${metadata.id}`);
        playerInstance.setup({
          file: metadata.video_source_url,
          mediaid: metadata.video_code,
          image: metadata.video_thumbnail_url,
          playbackRateControls: true,
          tracks: [
            {
              file: metadata.video_closed_caption_track_url,
              label: 'English',
              kind: 'captions',
              default: false,
            },
          ],
        });
        if (seconds) {
          jwplayer().on('firstFrame', function () {
            jwplayer().seek(seconds);
          });
          jwplayer().on('play', function () {
            videoPlayerEvent(true);
          });
          jwplayer().on('pause', function () {
            videoPlayerEvent(false);
          });
        }
      }
    }, 2);
  }

  function videoMetadata(videoSource) {
    try {
      return JSON.parse(videoSource.dataset.meta);
    } catch (e) {
      console.log('Unable to load Podcast Episode metadata', e); // eslint-disable-line no-console
    }
  }

  function requestFocus() {
    var metadata = videoMetadata(videoSource);
    var playerElement = getById(`video-player-${metadata.id}`);

    getById('pause-butt').classList.add('active');
    getById('play-butt').classList.remove('active');

    Runtime.videoMessage({
      action: 'play',
      url: metadata.video_source_url,
      seconds: currentTime,
    });

    videoPlayerEvent(true);
  }

  function handleVideoMessages(event) {
    const message = JSON.parse(event.detail);
    if (message.namespace !== 'video') {
      return;
    }

    switch (message.action) {
      case 'play':
        getById('pause-butt').classList.add('active');
        getById('play-butt').classList.remove('active');
        videoPlayerEvent(true);
        break;
      case 'pause':
        getById('pause-butt').classList.remove('active');
        getById('play-butt').classList.add('active');
        videoPlayerEvent(false);
        break;
      case 'tick':
        currentTime = message.currentTime;
        break;
      default:
        console.log('Unrecognized message: ', message); // eslint-disable-line no-console
    }
  }

  function initializePlayer(videoSource) {
    var seconds = timeToSeconds(getParameterByName('t') || '0');
    var metadata = videoMetadata(videoSource);

    if (Runtime.isNativeIOS('video')) {
      deviceType = 'iOS';
    } else if (Runtime.isNativeAndroid('videoMessage')) {
      deviceType = 'Android';
    } else {
      // jwplayer is initialized and no further interaction is needed
      initWebPlayer(seconds, metadata);
      return;
    }

    Runtime.videoMessage = (msg) => {
      window.ForemMobile.injectNativeMessage('video', msg);
    };

    var playerElement = getById(`video-player-${metadata.id}`);
    playerElement.addEventListener('click', requestFocus);

    playerElement.classList.add('native');
    getById('play-butt').classList.add('active');

    document.addEventListener('ForemMobile', handleVideoMessages);

    currentTime = `${seconds}`;
  }

  // If an video player element is found initialize it
  var videoSource = getById('video-player-source');
  if (videoSource !== null) {
    initializePlayer(videoSource);
  }
};
/**
 * This class helps managing native feature support. Can easily be referenced
 * from anywhere in JavaScript with:
 *
 * if (Runtime.isNativeiOS('video')) { ... }
 *
 * if (Runtime.isNativeAndroid('podcastMessage')) { ... }
 */
class Runtime {
  /**
   * This function returns a string combining the current Medium and OS
   * that represents the current Context where the app is running.
   *
   * @returns {String} "Medium-OS", for example "Browser-Android"
   */
  static currentContext() {
    return `${Runtime.currentMedium()}-${Runtime.currentOS()}`;
  }

  /**
   * This function returns a string that represents the current Medium where
   * the app is currently running. The currently supported mediums are Browser,
   * and ForemWebView.
   *
   * @returns {String} One of the supported Mediums
   */
  static currentMedium() {
    return /ForemWebView/i.test(navigator.userAgent)
      ? 'ForemWebView'
      : 'Browser';
  }

  /**
   * This function returns a string that represents the current OS where the app
   * is currently running. The currently supported Operating Systems are
   * Windows, Linux, macOS, Android and iOS.
   *
   * @returns {String} One of the supported Operating Systems or 'Unsupported'
   */
  static currentOS() {
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

    if (macosPlatforms.includes(window.navigator.platform)) {
      return 'macOS';
    } else if (iosPlatforms.includes(window.navigator.platform)) {
      return 'iOS';
    } else if (windowsPlatforms.includes(window.navigator.platform)) {
      return 'Windows';
    } else if (/Android/i.test(window.navigator.userAgent)) {
      return 'Android';
    } else if (/Linux/i.test(window.navigator.platform)) {
      return 'Linux';
    }

    return 'Unsupported';
  }

  /**
   * Checks the device for iOS (webkit) native feature support
   *
   * @function isNativeIOS
   * @param {string} namespace Specifies support for a specific feature
   *                           (i.e. video, podcast, etc)
   * @returns {boolean} true if current environment support native features
   */
  static isNativeIOS(namespace = null) {
    const nativeCheck =
      /DEV-Native-ios|ForemWebView/i.test(navigator.userAgent) &&
      window &&
      window.webkit &&
      window.webkit.messageHandlers;

    let namespaceCheck = true;
    if (nativeCheck && namespace) {
      namespaceCheck = window.webkit.messageHandlers[namespace] != undefined;
    }

    return nativeCheck && namespaceCheck;
  }

  /**
   * Checks the device for Android native feature support
   *
   * @function isNativeAndroid
   * @param {string} namespace Specifies support for a specific feature
   *                           (i.e. videoMessage, podcastMessage, etc)
   * @returns {boolean} true if current environment support native features
   */
  static isNativeAndroid(namespace = null) {
    const nativeCheck =
      /DEV-Native-android|ForemWebView/i.test(navigator.userAgent) &&
      typeof AndroidBridge !== 'undefined';

    let namespaceCheck = true;
    if (nativeCheck && namespace) {
      namespaceCheck = AndroidBridge[namespace] != undefined;
    }

    return nativeCheck && namespaceCheck;
  }

  /**
   * This function copies text to clipboard taking in consideration all
   * supported platforms.
   *
   * @param {string} text to be copied to the clipboard
   *
   * @returns {Promise} Resolves when succesful in copying to clipboard
   */
  static copyToClipboard(text) {
    return new Promise((resolve, reject) => {
      if (Runtime.isNativeAndroid('copyToClipboard')) {
        AndroidBridge.copyToClipboard(text);
        resolve();
      } else if (navigator.clipboard != null) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            resolve();
          })
          .catch((e) => {
            reject(e);
          });
      } else {
        reject('Unable to copy the text. Try reloading the page');
      }
    });
  }

  /**
   * Returns true if the supplied KeyboardEvent includes the OS-specific
   * modifier key. For example, the Cmd key on Apple platforms or the Ctrl key
   * on others.
   *
   * @param {KeyboardEvent} The event to check for the OS-specific modifier key
   *
   * @returns {Boolean} true if the event was fired with the OS-specific
   *                    modifier key, false otherwise. Also returns false if
   *                    the event is not a KeyboardEvent.
   */
  static hasOSSpecificModifier(event) {
    if (!(event instanceof KeyboardEvent)) {
      return false;
    }

    if (navigator.userAgent.indexOf('Mac OS X') >= 0) {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

  /**
   * Returns a string representation of the expected modifier key for the current OS.
   * This allows us to display correct shortcut key hints to users in the UI, and set up correct shortcut key bindings.
   *
   * @returns {string} either 'cmd' if on macOS, or 'ctrl' otherwise
   */
  static getOSKeyboardModifierKeyString() {
    return Runtime.currentOS() === 'macOS' ? 'cmd' : 'ctrl';
  }
};
'use strict';

function browserStoreCache(action, userData) {
  try {
    switch (action) {
      case 'set':
        localStorage.setItem('current_user', userData);
        localStorage.setItem(
          'config_body_class',
          JSON.parse(userData).config_body_class,
        );
        break;
      case 'remove':
        localStorage.removeItem('current_user');
        break;
      default:
        return localStorage.getItem('current_user');
    }
  } catch (err) {
    if (navigator.cookieEnabled) {
      browserStoreCache('remove');
    }
  }
  return undefined;
};
/* global timeAgo, filterXSS */

/* eslint-disable no-multi-str */

function buildArticleHTML(article) {
  var tagIcon = `<svg width="24" height="24" viewBox="0 0 24 24" class="crayons-icon" xmlns="http://www.w3.org/2000/svg"><path d="M7.784 14l.42-4H4V8h4.415l.525-5h2.011l-.525 5h3.989l.525-5h2.011l-.525 5H20v2h-3.784l-.42 4H20v2h-4.415l-.525 5h-2.011l.525-5H9.585l-.525 5H7.049l.525-5H4v-2h3.784zm2.011 0h3.99l.42-4h-3.99l-.42 4z"/></svg>`;
  if (article && article.class_name === 'Tag') {
    return `<article class="crayons-story">
        <div class="crayons-story__body flex items-start gap-2">
          <span class="radius-default p-2 shrink-0" style="background: ${
            article.bg_color_hex || '#000000'
          }1a; color: ${article.bg_color_hex || '#000'}">
            ${tagIcon}
          </span>
          <div>
            <h3 class="crayons-subtitle-2 lh-tight py-2">
              <a href="/t/${article.name}" class="c-link">
                ${article.name}
              </a>
            </h3>
            ${
              article.short_summary
                ? `<div class="truncate-at-3">${article.short_summary}</div>`
                : ''
            }
          </div>
        </div>
      </article>`;
  }

  if (article && article.class_name === 'PodcastEpisode') {
    return `<article class="crayons-story crayons-podcast-episode mb-2">
        <div class="crayons-story__body flex flex-start">
          <a href="${article.podcast.slug}" class="crayons-podcast-episode__cover">
            <img src="${article.podcast.image_url}" alt="${article.podcast.title}" loading="lazy" />
          </a>
          <div class="pt-2 flex-1">
            <p class="crayons-podcast-episode__author">
              ${article.podcast.title}
            </p>
            <h2 class="crayons-podcast-episode__title crayons-story__title mb-0">
              <a href="${article.path}" id="article-link-${article.id}">
                ${article.podcast.title}
              </a>
            </h2>
          </div>
        </div>
      </article>`;
  }

  if (article) {
    var container = document.getElementById('index-container');

    var flareTag = '';
    var currentTag = '';
    if (container) {
      currentTag = JSON.parse(container.dataset.params).tag;
    }
    if (article.flare_tag && currentTag !== article.flare_tag.name) {
      flareTag = `<a href="/t/${article.flare_tag.name}"
        class="crayons-tag crayons-tag--filled"
        style="--tag-bg: ${article.flare_tag.bg_color_hex}1a; --tag-prefix: ${article.flare_tag.bg_color_hex}; --tag-bg-hover: ${article.flare_tag.bg_color_hex}1a; --tag-prefix-hover: ${article.flare_tag.bg_color_hex};"
      >
        <span class="crayons-tag__prefix">#</span>
        ${article.flare_tag.name}
      </a>`;
    }

    var tagString = '';
    var tagList = article.tag_list || article.cached_tag_list_array || [];
    if (flareTag) {
      tagList = tagList.filter(function (tag) {
        return tag !== article.flare_tag.name;
      });
      tagString += flareTag;
    }
    if (tagList) {
      tagList.forEach(function buildTagString(t) {
        tagString =
          tagString +
          `<a href="/t/${t}" class="crayons-tag crayons-tag--monochrome"><span class="crayons-tag__prefix">#</span>${t}</a>\n`;
      });
    }

    var commentsDisplay = '';
    var commentsCount = '0';
    if ((article.comments_count || '0') > 0) {
      commentsCount = article.comments_count || '0';
    }

    var commentsAriaLabelText =
      ' aria-label="Comments for post ' +
      article.title +
      ' (' +
      commentsCount +
      ')" ';

    if (article.class_name !== 'User') {
      commentsDisplay =
        '<a href="' +
        article.path +
        '#comments"' +
        commentsAriaLabelText +
        'class="crayons-btn crayons-btn--s crayons-btn--ghost crayons-btn--icon-left "><svg class="crayons-icon" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 5h3a6 6 0 110 12v2.625c-3.75-1.5-9-3.75-9-8.625a6 6 0 016-6zM12 15.5h1.5a4.501 4.501 0 001.722-8.657A4.5 4.5 0 0013.5 6.5h-3A4.5 4.5 0 006 11c0 2.707 1.846 4.475 6 6.36V15.5z"/></svg>';
      if (commentsCount > 0) {
        commentsDisplay +=
          commentsCount +
          '<span class="hidden s:inline">&nbsp;comments</span></a>';
      } else {
        commentsDisplay +=
          '<span class="hidden s:inline">Add&nbsp;Comment</span></a>';
      }
    }

    var reactionsCount = article.public_reactions_count;
    var reactionsDisplay = '';
    var reactionsText = reactionsCount === 1 ? 'reaction' : 'reactions';

    if (article.class_name !== 'User' && reactionsCount > 0) {
      reactionsDisplay =
        '<a href="' +
        article.path +
        '"' +
        commentsAriaLabelText +
        'class="crayons-btn crayons-btn--s crayons-btn--ghost crayons-btn--icon-left"><svg class="crayons-icon" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M18.884 12.595l.01.011L12 19.5l-6.894-6.894.01-.01A4.875 4.875 0 0112 5.73a4.875 4.875 0 016.884 6.865zM6.431 7.037a3.375 3.375 0 000 4.773L12 17.38l5.569-5.569a3.375 3.375 0 10-4.773-4.773L9.613 10.22l-1.06-1.062 2.371-2.372a3.375 3.375 0 00-4.492.25v.001z"/></svg>' +
        reactionsCount +
        `<span class="hidden s:inline">&nbsp;${reactionsText}</span></a>`;
    }

    var picUrl;
    var profileUsername;
    var userName;
    if (article.class_name === 'PodcastEpisode') {
      picUrl = article.main_image;
      profileUsername = article.slug;
      userName = article.title;
    } else {
      picUrl = article.user.profile_image_90;
      profileUsername = article.user.username;
      userName = article.user.name;
    }
    var orgHeadline = '';
    var forOrganization = '';
    var organizationLogo = '';
    var organizationClasses = 'crayons-avatar--l';

    if (
      article.organization &&
      !document.getElementById('organization-article-index')
    ) {
      organizationLogo =
        '<a href="/' +
        article.organization.slug +
        '" class="crayons-logo crayons-logo--l"><img alt="' +
        article.organization.name +
        ' logo" src="' +
        article.organization.profile_image_90 +
        '" class="crayons-logo__image" loading="lazy"/></a>';
      forOrganization =
        '<span><span class="crayons-story__tertiary fw-normal"> for </span><a href="/' +
        article.organization.slug +
        '" class="crayons-story__secondary fw-medium">' +
        article.organization.name +
        '</a></span>';
      organizationClasses =
        'crayons-avatar--s absolute -right-2 -bottom-2 border-solid border-2 border-base-inverted';
    }

    var timeAgoInWords = '';
    if (article.published_at_int) {
      timeAgoInWords = timeAgo({ oldTimeInSeconds: article.published_at_int });
    }

    var publishDate = '';
    if (article.readable_publish_date) {
      if (article.published_timestamp) {
        publishDate =
          '<time datetime="' +
          article.published_timestamp +
          '">' +
          article.readable_publish_date +
          ' ' +
          timeAgoInWords +
          '</time>';
      } else {
        publishDate =
          '<time>' +
          article.readable_publish_date +
          ' ' +
          timeAgoInWords +
          '</time>';
      }
    }

    // We only show profile preview cards for Posts
    var isArticle = article.class_name === 'Article';

    // We need to be able to set the data-info hash attribute with escaped characters.
    var name = article.user.name.replace(/[\\"']/g, '\\$&');
    var previewCardContent = `
      <div id="story-author-preview-content-${article.id}" class="profile-preview-card__content crayons-dropdown p-4 pt-0 branded-7" data-repositioning-dropdown="true" style="border-top-color: var(--card-color);" data-testid="profile-preview-card">
        <div class="gap-4 grid">
          <div class="-mt-4">
            <a href="/${profileUsername}" class="flex">
              <span class="crayons-avatar crayons-avatar--xl mr-2 shrink-0">
                <img src="${picUrl}" class="crayons-avatar__image" alt="" loading="lazy" />
              </span>
              <span class="crayons-link crayons-subtitle-2 mt-5">${article.user.name}</span>
            </a>
          </div>
          <div class="print-hidden">
            <button class="crayons-btn follow-action-button whitespace-nowrap follow-user w-100" data-info='{"id": ${article.user_id}, "className": "User", "style": "full", "name": "${name}"}'>Follow</button>
          </div>
          <div class="author-preview-metadata-container" data-author-id="${article.user_id}"></div>
        </div>
      </div>
    `;

    var meta = `
      <div class="crayons-story__meta">
        <div class="crayons-story__author-pic">
          ${organizationLogo}
          <a href="/${profileUsername}" class="crayons-avatar ${organizationClasses}">
            <img src="${picUrl}" alt="${profileUsername} profile" class="crayons-avatar__image" loading="lazy" />
          </a>
        </div>
        <div>
          <div>
            <a href="/${profileUsername}" class="crayons-story__secondary fw-medium ${
      isArticle ? 'm:hidden' : ''
    }">${filterXSS(article.user.name)}</a>
    ${
      isArticle
        ? `<div class="profile-preview-card relative mb-4 s:mb-0 fw-medium hidden m:inline-block"><button id="story-author-preview-trigger-${article.id}" aria-controls="story-author-preview-content-${article.id}" class="profile-preview-card__trigger fs-s crayons-btn crayons-btn--ghost p-1 -ml-1 -my-2" aria-label="${article.user.name} profile details">${article.user.name}</button>${previewCardContent}</div>`
        : ''
    }
            ${forOrganization}
          </div>
          <a href="${
            article.path
          }" class="crayons-story__tertiary fs-xs">${publishDate}</a>
        </div>
      </div>
    `;

    var bodyTextSnippet = '';
    var searchSnippetHTML = '';
    if (article.highlight && article.highlight.body_text.length > 0) {
      var firstSnippetChar = article.highlight.body_text[0];
      var startingEllipsis = '';
      if (firstSnippetChar.toLowerCase() !== firstSnippetChar.toUpperCase()) {
        startingEllipsis = '…';
      }
      bodyTextSnippet =
        startingEllipsis + article.highlight.body_text.join('...') + '…';
      if (bodyTextSnippet.length > 0) {
        searchSnippetHTML =
          '<div class="crayons-story__snippet mb-1">' +
          bodyTextSnippet +
          '</div>';
      }
    }

    var readingTimeHTML = '';
    if (article.class_name === 'Article') {
      // we have ` ... || null` for the case article.reading_time is undefined
      readingTimeHTML =
        '<small class="crayons-story__tertiary fs-xs mr-2">' +
        ((article.reading_time || null) < 1
          ? '1 min'
          : article.reading_time + ' min') +
        ' read</small>';
    }

    var saveButton = '';
    if (article.class_name === 'Article') {
      saveButton =
        '<button type="button" id="article-save-button-' +
        article.id +
        '" class="crayons-btn crayons-btn--secondary crayons-btn--s bookmark-button" data-reactable-id="' +
        article.id +
        '">\
                      <span class="bm-initial">Save</span>\
                      <span class="bm-success">Saved</span>\
                    </button>';
    } else if (article.class_name === 'User') {
      saveButton = `
        <button type="button"
          class="crayons-btn crayons-btn--secondary crayons-btn--icon-left fs-s bookmark-button article-engagement-count engage-button follow-action-button follow-user"
          data-info='{"id": ${article.id},"className":"User", "name": "${article.user.name}"}'
        data-follow-action-button>
          &nbsp;
        </button>`;
    }

    var videoHTML = '';
    if (article.cloudinary_video_url) {
      videoHTML =
        '<a href="' +
        article.path +
        '" class="crayons-story__video" style="background-image:url(' +
        article.cloudinary_video_url +
        ')"><div class="crayons-story__video__time">' +
        (article.video_duration_string || article.video_duration_in_minutes) +
        '</div></a>';
    }

    var navigationLink = `
      <a
        href="${article.path}"
        aria-labelledby="article-link-${article.id}"
        class="crayons-story__hidden-navigation-link"
      >
        ${filterXSS(article.title)}
      </a>
    `;

    return `<article class="crayons-story"
      data-article-path="${article.path}"
      id="article-${article.id}"
      data-content-user-id="${article.user_id}">\
        ${navigationLink}\
        <div role="presentation">\
          ${videoHTML}\
          <div class="crayons-story__body">\
            <div class="crayons-story__top">\
              ${meta}
            </div>\
            <div class="crayons-story__indention">
              <h3 class="crayons-story__title">
                <a href="${article.path}" id="article-link-${article.id}">
                  ${filterXSS(article.title)}
                </a>
              </h3>\
              <div class="crayons-story__tags">
                ${tagString}
              </div>\
              ${searchSnippetHTML}\
              <div class="crayons-story__bottom">\
                <div class="crayons-story__details">
                  ${reactionsDisplay} ${commentsDisplay}
                </div>\
                <div class="crayons-story__save">\
                  ${readingTimeHTML}\
                  ${saveButton}
                </div>\
              </div>\
            </div>\
          </div>\
        </div>\
      </article>`;
  }

  return '';
}

/* eslint-enable no-multi-str */;
function buildCommentFormHTML(commentableId, commentableType, parentId) {
  var authToken = document.querySelector("meta[name='csrf-token']").getAttribute('content');
  var user = userData();
  var codeOfConductHTML = ""
  if (user && !user.codeOfConduct && user.commentCount < 1){
    codeOfConductHTML =   '<div class="code-of-conduct sub-comment-code-of-conduct" style="display:block" id="toggle-code-of-conduct-checkbox">\
                            <input class="checkbox" type="checkbox" name="checked_code_of_conduct" required />\
                            <label for="checked_code_of_conduct">I\'ve read the <a href="/code-of-conduct">code of conduct</a></label>\
                          </div>'
  }
  var randomIdNumber = Math.floor(Math.random() * 1991);

  return `<form class="comment-form pt-4" onsubmit="handleCommentSubmit.bind(this)(event)" id="new-comment-${parentId}" action="/comments" accept-charset="UTF-8" method="post" data-comment-id="${parentId}">
      <input name="utf8" type="hidden" value="&#x2713;" />
      <input type="hidden" name="authenticity_token" value="${authToken}">
      <input value="${commentableId}" type="hidden" name="comment[commentable_id]" id="comment_commentable_id" />
      <input value="${commentableType}" type="hidden" name="comment[commentable_type]" id="comment_commentable_type" />
      <input value="${parentId}" type="hidden" name="comment[parent_id]" id="comment_parent_id" />
      <div class="comment-form__inner">
        <div class="comment-form__field">
          <textarea id="textarea-for-${parentId}" class="crayons-textfield crayons-textfield--ghost comment-textarea" name="comment[body_markdown]" placeholder="Reply..." aria-label="Reply to a comment..." required="required" onkeydown="handleKeyDown(event)" onfocus="handleFocus(event)" oninput="handleChange(event)" onkeyup="handleKeyUp(event)"></textarea>
          <div class="comment-form__toolbar">
            <div class="editor-image-upload">
              <input type="file" id="image-upload-${randomIdNumber}"  name="file" accept="image/*" style="display:none">
              <button type="button" class="crayons-btn crayons-btn--s crayons-btn--icon-left crayons-btn--ghost-dimmed" onclick="handleImageUpload(event, ${randomIdNumber})" id="image-upload-button-${randomIdNumber}">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="crayons-icon"><path d="M20 5H4v14l9.292-9.294a1 1 0 011.414 0L20 15.01V5zM2 3.993A1 1 0 012.992 3h18.016c.548 0 .992.445.992.993v16.014a1 1 0 01-.992.993H2.992A.993.993 0 012 20.007V3.993zM8 11a2 2 0 110-4 2 2 0 010 4z"/></svg>
                <span class="hidden s:inline-block">Upload image</span>
              </button>
              <label  class="image-upload-file-label" id="image-upload-file-label-${randomIdNumber}"></label>
              <input type="submit" id="image-upload-submit-${randomIdNumber}" value="Upload" style="display:none">
              <input class="crayons-textfield fs-s w-auto uploaded-image hidden" type="text" id="uploaded-image-${randomIdNumber}" />
            </div>
            <button type="button" class="crayons-btn crayons-btn--s crayons-btn--icon-left crayons-btn--ghost-dimmed response-templates-button" title="Use a response template" data-has-listener="false">
              <svg width="24" height="24" class="crayons-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 18.5V5a3 3 0 013-3h14a1 1 0 011 1v18a1 1 0 01-1 1H6.5A3.5 3.5 0 013 18.5zM19 20v-3H6.5a1.5 1.5 0 100 3H19zM10 4H6a1 1 0 00-1 1v10.337A3.485 3.485 0 016.5 15H19V4h-2v8l-3.5-2-3.5 2V4z"/></svg>
              <span class="hidden s:inline-block">Templates</span>
            </button>
            <a href="/p/editor_guide" class="crayons-btn crayons-btn--ghost-dimmed crayons-btn--icon crayons-btn--s ml-auto" target="_blank" rel="noopener" title="Markdown Guide">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="crayons-icon"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>
            </a>
          </div>
        </div>
        <div class="response-templates-container crayons-card crayons-card--secondary p-4 mb-4 fs-base comment-form__templates hidden">
          <header>
            <button type="button" class="personal-template-button active" data-target-type="personal" data-form-id="new_comment">Personal</button>
            <button type="button" class="moderator-template-button hidden" data-target-type="moderator" data-form-id="new_comment">Moderator</button>
          </header>
          <img class="loading-img hidden" src="https://dev.to/assets/loading-ellipsis-b714cf681fd66c853ff6f03dd161b77aa3c80e03cdc06f478b695f42770421e9.svg" alt="loading">
          <div class="personal-responses-container"></div>
          <div class="moderator-responses-container hidden"></div>
          <a target="_blank" rel="noopener nofollow" href="/settings/response-templates">Create template</a>
          <p>Templates let you quickly answer FAQs or store snippets for re-use.</p>
        </div>
        <div class="comment-form__preview text-styles text-styles--secondary"></div>
        <div class="comment-form__buttons mb-4 whitespace-nowrap">
          <button type="submit" class="crayons-btn comment-action-button mr-2 js-btn-enable" name="submit" disabled>Submit</button>
          <button type="button" class="preview-toggle crayons-btn crayons-btn--secondary comment-action-button comment-action-preview mr-2 js-btn-enable" onclick="handleCommentPreview(event)" disabled>Preview</button>
          <button type="button" class="crayons-btn crayons-btn--ghost" onclick="handleFormClose(event)">Dismiss</button>
        </div>
      </div>
    </form>`;
};
function buildCommentHTML(comment) {
  var iconSmallOverflowHorizontal = `<svg width="24" height="24" viewBox="0 0 24 24" class="crayons-icon pointer-events-none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.25 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5.25 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm3.75 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>`;
  var iconCollapse = `<svg width="24" height="24" class="crayons-icon expanded" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 10.6771L8 6.93529L8.99982 6L12 8.80653L15.0002 6L16 6.93529L12 10.6771ZM12 15.1935L8.99982 18L8 17.0647L12 13.3229L16 17.0647L15.0002 17.9993L12 15.1935Z" /></svg>`;
  var iconExpand = `<svg width="24" height="24" class="crayons-icon collapsed" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 18L8 14.2287L8.99982 13.286L12 16.1147L15.0002 13.286L16 14.2287L12 18ZM12 7.88533L8.99982 10.714L8 9.77133L12 6L16 9.77133L15.0002 10.7133L12 7.88533Z" /></svg>`;

  var depthClass = "";
  var customClass = "";

  var detailsStartHTML = "";
  var detailsEndHTML = "";

  var commentHeader = "";
  var commentFooter = "";
  var commentAvatar = "";
  var commentBody = "";

  if ( comment.depth == 0 ) {
    depthClass += "root ";
  } else {
    depthClass += "child "
  }

  if ( comment.depth > 3 ) {
    depthClass += "comment--too-deep ";
  }

  if (comment.newly_created) {
    customClass = "comment-created-via-fetch"
  }

  if (comment.depth < 3) {
    detailsStartHTML = `
      <details class="comment-wrapper comment-wrapper--deep-${ comment.depth } js-comment-wrapper" open>
        <summary aria-label="Toggle this comment (and replies)">
          <span class="inline-block align-middle ${ comment.depth > 0 ? 'mx-0' : 'm:mx-1'}">
            ${ iconCollapse }
            ${ iconExpand }
          </span>
          <span class="js-collapse-comment-content inline-block align-middle"></span>
        </summary>
    `;
    detailsEndHTML = `</details>`;
  }

  commentAvatar = `<a href="/${ comment.user.username }" class="shrink-0 crayons-avatar ${ comment.depth == 0 ? 'm:crayons-avatar--l mt-4 m:mt-3' : 'mt-4' }">
    <img class="crayons-avatar__image" width="32" height="32" src="${ comment.user.profile_pic }" alt="${ comment.user.username } profile" />
  </a>`;

  commentHeader = `<div class="comment__header" >
    <a href="/${ comment.user.username }" class="crayons-link crayons-link--secondary flex items-center fw-medium m:hidden">
      <span class="js-comment-username">${ comment.user.name }</span>
    </a>
    <div class="profile-preview-card relative mb-4 s:mb-0 fw-medium hidden m:block">
      <button id="comment-profile-preview-trigger-${comment.id}" aria-controls="comment-profile-preview-content-${comment.id}" class="profile-preview-card__trigger p-1 -my-1 -ml-1 crayons-btn crayons-btn--ghost" aria-label="${comment.user.name} profile details">${comment.user.name}</button>
      <span data-js-comment-user-id="${comment.user.id}" data-js-dropdown-content-id="comment-profile-preview-content-${comment.id}" class="preview-card-placeholder"></span>
    </div>
    <span class="color-base-30 px-2 m:pl-0" role="presentation">&bull;</span>

    <a href="${ comment.url }" class="comment-date crayons-link crayons-link--secondary fs-s">
      <time datetime="${ comment.published_timestamp }">
        ${ comment.readable_publish_date }
      </time>
    </a>

    <div class="comment__dropdown">
      <button  id="comment-dropdown-trigger-${comment.id}" aria-controls="comment-dropdown-${comment.id}" aria-expanded="false" class="dropbtn comment__dropdown-trigger crayons-btn crayons-btn--s crayons-btn--ghost crayons-btn--icon" aria-label="Toggle dropdown menu" aria-haspopup="true">
        ${ iconSmallOverflowHorizontal }
      </button>
      <div id="comment-dropdown-${comment.id}" class="crayons-dropdown right-1 s:right-0 s:left-auto fs-base dropdown">
        <ul class="m-0">
          <li><a href="${ comment.url }" class="crayons-link crayons-link--block permalink-copybtn" aria-label="Copy link to ${ comment.user.name }'s comment" data-no-instant>${ I18n.t('core.copy_link') }</a></li>
          <li><a href="${ comment.url }/settings" class="crayons-link crayons-link--block" aria-label="Go to ${ comment.user.name }'s comment settings">Settings</a></li>
          <li><a href="/report-abuse?url=${ comment.url }" class="crayons-link crayons-link--block" aria-label="Report ${ comment.user.name }'s comment as abusive or violating our code of conduct and/or terms and conditions">${ I18n.t('core.report_abuse') }</a></li>
          <li class="${ comment.newly_created ? '' : 'hidden' }"><a href="${ comment.url }/edit" class="crayons-link crayons-link--block" rel="nofollow" aria-label="Edit this comment">Edit</a></li>
          <li class="${ comment.newly_created ? '' : 'hidden' }"><a data-no-instant="" href="${ comment.url }/delete_confirm" class="crayons-link crayons-link--block" rel="nofollow" aria-label="Delete this comment">Delete</a></li>
        </ul>
      </div>
    </div>
  </div>`;

  commentFooter = `<footer class="comment__footer">
    ${ react(comment) }
    ${ reply(comment) }
  </footer>`;

  commentBody = `${ detailsStartHTML }
    <div class="comment single-comment-node ${ depthClass } comment--deep-${ comment.depth }" id="comment-node-${ comment.id }" data-comment-id="${ comment.id }" data-path="${ comment.url }" data-comment-author-id="${ comment.user.id }" data-current-user-comment="${ comment.newly_created }" data-content-user-id="${ comment.user.id }">
      <div class="comment__inner">
        ${ commentAvatar }
        <div class="inner-comment comment__details">
          <div class="comment__content crayons-card">
            ${ commentHeader }
            <div class="comment__body text-styles text-styles--secondary body">
              ${ comment.body_html }
            </div>
          </div>
          ${ commentFooter }
        </div>
      </div>
    </div>
  ${ detailsEndHTML }`;

  return commentBody;
}

function reply(comment) {
  var iconSmallComment = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" class="crayons-icon reaction-icon not-reacted"><path d="M10.5 5h3a6 6 0 110 12v2.625c-3.75-1.5-9-3.75-9-8.625a6 6 0 016-6zM12 15.5h1.5a4.501 4.501 0 001.722-8.657A4.5 4.5 0 0013.5 6.5h-3A4.5 4.5 0 006 11c0 2.707 1.846 4.475 6 6.36V15.5z"/></svg>`;
  var replyButton = `<a class="js actions crayons-btn crayons-btn--ghost crayons-btn--s crayons-btn--icon-left toggle-reply-form mr-1 inline-flex"
    href="#${ comment.url }"
    data-comment-id="${ comment.id }"
    data-path="${ comment.url }"
    rel="nofollow">
    ${ iconSmallComment }
    <span class="hidden m:inline-block">Reply</span>
  </a>`;
  if (comment.newly_created) {
    return replyButton;
  }
}

function react(comment) {
  var reactedClass = "";
  var num = 1;
  var iconSmallHeart = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" class="crayons-icon reaction-icon not-reacted"><path d="M18.884 12.595l.01.011L12 19.5l-6.894-6.894.01-.01A4.875 4.875 0 0112 5.73a4.875 4.875 0 016.884 6.865zM6.431 7.037a3.375 3.375 0 000 4.773L12 17.38l5.569-5.569a3.375 3.375 0 10-4.773-4.773L9.613 10.22l-1.06-1.062 2.371-2.372a3.375 3.375 0 00-4.492.25v.001z"/></svg>`;
  var iconSmallHeartFilled = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="crayons-icon reaction-icon--like reaction-icon reacted"><path d="M5.116 12.595a4.875 4.875 0 015.56-7.68h-.002L7.493 8.098l1.06 1.061 3.181-3.182a4.875 4.875 0 016.895 6.894L12 19.5l-6.894-6.894.01-.01z"/></svg>`;

  if (!comment.newly_created && comment.heart_ids.indexOf(userData().id) > -1) {
    reactedClass = "reacted"
  }

  if (!comment.newly_created) {
    num = comment.public_reactions_count;
  }

  var reactButton = `<button class="crayons-btn crayons-btn--ghost crayons-btn--icon-left crayons-btn--s mr-1 reaction-like inline-flex reaction-button" id="button-for-comment-${ comment.id }" data-comment-id="${ comment.id }">
    ${ iconSmallHeart }
    ${ iconSmallHeartFilled }
    <span class="reactions-count" id="reactions-count-${ comment.id }">${ num }</span>
    <span class="reactions-label hidden m:inline-block">like</span>
  </button>`;

  return reactButton;
};
function checkUserLoggedIn() {
  const body = document.body;
  if (!body) {
    return false;
  }

  return body.getAttribute('data-user-status') === 'logged-in';
};
function dynamicallyLoadScript(url) {
  if (document.querySelector(`script[src='${url}']`)) return;

  const script = document.createElement('script');
  script.src = url;

  document.head.appendChild(script);
};
/* global Honeybadger */

function getCsrfToken() {
  var promise = new Promise(function callback(resolve, reject) {
    var i = 0;
    // eslint-disable-next-line consistent-return
    var waitingOnCSRF = setInterval(function waitOnCSRF() {
      var metaTag = document.querySelector("meta[name='csrf-token']");
      i += 1;

      if (metaTag) {
        clearInterval(waitingOnCSRF);
        var authToken = metaTag.getAttribute('content');
        return resolve(authToken);
      }

      if (i === 1000) {
        clearInterval(waitingOnCSRF);
        Honeybadger.notify(
          'Could not locate CSRF metatag ' +
            JSON.stringify(localStorage.current_user),
        );
        return reject(new Error('Could not locate CSRF meta tag on the page.'));
      }
    }, 5);
  });
  return promise;
};
'use strict';

function getCurrentPage(classString) {
  return (
    document.querySelectorAll("[data-current-page='" + classString + "']")
      .length > 0
  );
};
'use strict';

var $fetchedImageUrls = [];
function getImageForLink(elem) {
  var imageUrl = elem.getAttribute('data-preload-image');
  if (imageUrl && $fetchedImageUrls.indexOf(imageUrl) === -1) {
    var img = new Image();
    img.src = imageUrl;
    $fetchedImageUrls.push(imageUrl);
  }
};
'use strict';

function insertAfter(newNode, referenceNode) {
  if (referenceNode && referenceNode.parentNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }
};
'use strict';

/* Local date/time utilities */

/*
  Convert string timestamp to local time, using the given locale.

  timestamp should be something like '2019-05-03T16:02:50.908Z'
  locale can be `navigator.language` or a custom locale. defaults to 'default'
  options are `Intl.DateTimeFormat` options

  see <https://developer.mozilla.org//docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat>
  for more information.
*/
function timestampToLocalDateTime(timestamp, locale, options) {
  if (!timestamp) {
    return '';
  }

  try {
    var time = new Date(timestamp);
    return new Intl.DateTimeFormat(locale || 'default', options).format(time);
  } catch (e) {
    return '';
  }
}

function addLocalizedDateTimeToElementsTitles(elements, timestampAttribute) {
  for (var i = 0; i < elements.length; i += 1) {
    var element = elements[i];

    // get UTC timestamp set by the server
    var timestamp = element.getAttribute(timestampAttribute || 'datetime');

    if (timestamp) {
      // add a full datetime to the element title, visible on hover.
      // `navigator.language` is used to allow the date to be localized
      // according to the browser's locale
      // see <https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language>
      var localDateTime = timestampToLocalDateTimeLong(timestamp);
      element.setAttribute('title', localDateTime);
    }
  }
}

function localizeTimeElements(elements, timeOptions) {
  for (let i = 0; i < elements.length; i += 1) {
    const element = elements[i];

    const timestamp = element.getAttribute('datetime');
    if (timestamp) {
      const localDateTime = timestampToLocalDateTime(
        timestamp,
        navigator.language,
        timeOptions,
      );

      element.textContent = localDateTime;
    }
  }
}

function timestampToLocalDateTimeLong(timestamp) {
  // example: "Wednesday, April 3, 2019, 2:55:14 PM"

  return timestampToLocalDateTime(timestamp, navigator.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
}

function timestampToLocalDateTimeShort(timestamp) {
  // example: "10 Dec 2018" if it is not the current year
  // example: "6 Sep" if it is the current year

  if (timestamp) {
    const currentYear = new Date().getFullYear();
    const givenYear = new Date(timestamp).getFullYear();

    var timeOptions = {
      day: 'numeric',
      month: 'short',
    };

    if (givenYear !== currentYear) {
      timeOptions.year = 'numeric';
    }

    return timestampToLocalDateTime(timestamp, navigator.language, timeOptions);
  }

  return '';
}

if (typeof globalThis !== 'undefined') {
  globalThis.timestampToLocalDateTimeLong = timestampToLocalDateTimeLong; // eslint-disable-line no-undef
  globalThis.timestampToLocalDateTimeShort = timestampToLocalDateTimeShort; // eslint-disable-line no-undef
};
'use strict';

function localStorageTest() {
  var test = 'devtolocalstoragetestforavaialbility';
  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};
'use strict';

function preventDefaultAction(event) {
  event.preventDefault();
};
'use strict';

const fetchCallback = ({ url, headers = {}, addTokenToBody = false, body }) => {
  return (csrfToken) => {
    if (addTokenToBody) {
      body.append('authenticity_token', csrfToken);
    }
    return window.fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        ...headers,
      },
      body,
      credentials: 'same-origin',
    });
  };
};

function sendFetch(switchStatement, body) {
  switch (switchStatement) {
    case 'article-preview':
      return fetchCallback({
        url: '/articles/preview',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });
    case 'reaction-creation':
      return fetchCallback({
        url: '/reactions',
        addTokenToBody: true,
        body,
      });
    case 'image-upload':
      return fetchCallback({
        url: '/image_uploads',
        addTokenToBody: true,
        body,
      });
    case 'follow-creation':
      return fetchCallback({
        url: '/follows',
        addTokenToBody: true,
        body,
      });
    case 'block-user':
      return fetchCallback({
        url: '/user_blocks',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        addTokenToBody: false,
        body,
      });
    case 'comment-creation':
      return fetchCallback({
        url: '/comments',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
    case 'comment-preview':
      return fetchCallback({
        url: '/comments/preview',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
    case 'user_subscriptions':
      return fetchCallback({
        url: '/user_subscriptions',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });
    default:
      console.log('A wrong switchStatement was used.'); // eslint-disable-line no-console
      break;
  }
  return true;
};
'use strict';

function sendHapticMessage(message) {
  try {
    if (
      window &&
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.haptic
    ) {
      window.webkit.messageHandlers.haptic.postMessage(message);
    }
  } catch (err) {
    console.log(err.message); // eslint-disable-line no-console
  }
};
function showLoginModal() {
  window.Forem.showModal({
    title: 'Log in to continue',
    contentSelector: '#global-signup-modal',
    overlay: true,
  });
};
/**
 * HTML ID for modal DOM node
 *
 * @private
 * @constant modalId *
 * @type {string}
 */
const modalId = 'user-alert-modal';

/**
 * Displays a general purpose user alert modal with a title, body text, and confirmation button.
 *
 * @function showUserAlertModal
 * @param {string} title The title/heading text to be displayed
 * @param {string} text The body text to be displayed
 * @param {string} confirm_text Text of the confirmation button
 *
 * @example
 * showUserAlertModal('Warning', 'You must wait', 'OK', '/faq/why-must-i-wait', 'Why must I wait?');
 */
function showUserAlertModal(title, text, confirm_text) {
  buildModalDiv(text, confirm_text);
  window.Forem.showModal({
    title,
    contentSelector: `#${modalId}`,
    overlay: true,
  });
}
/**
 * Displays a user rate limit alert modal letting the user know what they did that exceeded a rate limit,
 * and gives them links to explain why they must wait
 *
 * @function showRateLimitModal
 * @param {string} element Description of the element that throw the error
 * @param {string} action_ing The -ing form of the action taken by the user
 * @param {string} action_past The past tense of the action taken by the user
 * @param {string} timeframe Description of the time that we need to wait
 *
 * @example
 * showRateLimitModal('Made a comment', 'comment again')
 */
function showRateLimitModal({
  element,
  action_ing,
  action_past,
  timeframe = 'a moment',
}) {
  let rateLimitText = buildRateLimitText({
    element,
    action_ing,
    action_past,
    timeframe,
  });
  let rateLimitLink = '/faq';
  showUserAlertModal(
    `Wait ${timeframe}...`,
    rateLimitText,
    'Got it',
    rateLimitLink,
    'Why do I have to wait?',
  );
}
/**
 * Displays the corresponding modal after an error.
 *
 * @function showModalAfterError
 * @param {Object} response The response from the API
 * @param {string} element Description of the element that throw the error
 * @param {string} action_ing The -ing form of the action taken by the user
 * @param {string} action_past The past tense of the action taken by the user
 * @param {string} timeframe Description of the time that we need to wait
 *
 * @example
 * showModalAfterError(response, 'made a comment', 'making another comment', 'a moment');
 */
function showModalAfterError({
  response,
  element,
  action_ing,
  action_past,
  timeframe = 'a moment',
}) {
  response
    .json()
    .then(function parseError(errorResponse) {
      if (response.status === 429) {
        showRateLimitModal({ element, action_ing, action_past, timeframe });
      } else {
        showUserAlertModal(
          `Error ${action_ing} ${element}`,
          `Your ${element} could not be ${action_past} due to an error: ` +
            errorResponse.error,
          'OK',
        );
      }
    })
    .catch(function parseError(error) {
      showUserAlertModal(
        `Error ${action_ing} ${element}`,
        `Your ${element} could not be ${action_past} due to a server error`,
        'OK',
      );
    });
}

/**
 * HTML template for modal
 *
 * @private
 * @function getModalHtml
 *
 * @param {string} text The body text to be displayed
 * @param {string} confirm_text Text of the confirmation button
 *
 * @returns {string} HTML for the modal
 */
const getModalHtml = (text, confirm_text) => `
   <div id="${modalId}" hidden>
     <div class="flex flex-col">
       <p class="color-base-70">
         ${text}
       </p>
       <button class="crayons-btn mt-4 ml-auto" type="button" onClick="window.Forem.closeModal()">
         ${confirm_text}
       </button>
     </div>
   </div>
 `;

/**
 * Constructs wording for rate limit modals
 *
 * @private
 * @function buildRateLimitText
 *
 * @param {string} element Description of the element that throw the error
 * @param {string} action_ing The -ing form of the action taken by the user
 * @param {string} action_past The past tense of the action taken by the user
 * @param {string} timeframe Description of the time that we need to wait
 *
 * @returns {string} Formatted body text for a rate limit modal
 */
function buildRateLimitText({ element, action_ing, action_past, timeframe }) {
  return `Since you recently ${action_past} a ${element}, you’ll need to wait ${timeframe} before ${action_ing} another ${element}.`;
}

/**
 * Checks for the alert modal, and if it's not present builds and inserts it in the DOM
 *
 * @private
 * @function buildModalDiv
 *
 * @param {string} text The body text to be displayed
 * @param {string} confirm_text Text of the confirmation button
 *
 * @returns {Element} DOM node of the inserted alert modal
 */
function buildModalDiv(text, confirm_text) {
  let modalDiv = document.getElementById(modalId);
  if (!modalDiv) {
    modalDiv = getModal(text, confirm_text);
    document.body.appendChild(modalDiv);
  } else {
    modalDiv.outerHTML = getModal(text, confirm_text).outerHTML;
  }
  return modalDiv;
}

/**
 * Takes template HTML for a modal and creates a DOM node based on supplied arguments
 *
 * @private
 * @function getModal
 *
 * @param {string} text The body text to be displayed
 * @param {string} confirm_text Text of the confirmation button
 *
 * @returns {Element} DOM node of alert modal with formatted text
 */
function getModal(text, confirm_text) {
  let wrapper = document.createElement('div');
  wrapper.innerHTML = getModalHtml(text, confirm_text);
  return wrapper;
};
function slideSidebar(side, direction) {
  if (!document.getElementById('sidebar-wrapper-' + side)) {
    return;
  }
  const mainContent =
    document.getElementById('main-content') ||
    document.getElementById('articles-list');
  if (direction === 'intoView') {
    mainContent.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document
      .getElementById('sidebar-wrapper-' + side)
      .classList.add('swiped-in');
    mainContent.addEventListener('touchmove', preventDefaultAction, false);
  } else {
    mainContent.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document
      .getElementById('sidebar-wrapper-' + side)
      .classList.remove('swiped-in');
    mainContent.removeEventListener('touchmove', preventDefaultAction, false);
  }
};
'use strict';

function secondsToHumanUnitAgo(seconds) {
  const times = [
    ['second', 1],
    ['min', 60],
    ['hour', 60 * 60],
    ['day', 60 * 60 * 24],
    ['week', 60 * 60 * 24 * 7],
    ['month', 60 * 60 * 24 * 30],
    ['year', 60 * 60 * 24 * 365],
  ];

  if (seconds < times[0][1]) return 'just now';

  let scale = 0;
  // If the amount of seconds is more than a minute, we change the scale to minutes
  // If the amount of seconds then is more than an hour, we change the scale to hours
  // This continues until the unit above our current scale is longer than `seconds`, or doesn't exist
  while (scale + 1 < times.length && seconds >= times[scale + 1][1]) scale += 1;

  const wholeUnits = Math.floor(seconds / times[scale][1]);
  const unitName = times[scale][0] + (wholeUnits === 1 ? '' : 's');

  return wholeUnits + ' ' + unitName + ' ago';
}

/**
 * Returns a given time in seconds as a human readable form, e.g. (5 min ago)
 *
 * @param {object} options
 * @param {number} options.oldTimeInSeconds
 * @param {function} [(humanTime) =>
      `<span class="time-ago-indicator">(${humanTime})</span>`] options.formatter
 * @param {number} [60 * 60 * 24 - 1] options.maxDisplayedAge The maximum display age in seconds
 *
 * @returns {string} A formatted string in human readable form. Note that the default formatter returns a string with markup in it.
 */
function timeAgo({
  oldTimeInSeconds,
  formatter = (humanTime) =>
    `<span class="time-ago-indicator">(${humanTime})</span>`,
  maxDisplayedAge = 60 * 60 * 24 - 1,
}) {
  const timeNow = new Date() / 1000;
  const diff = Math.round(timeNow - oldTimeInSeconds);

  if (diff > maxDisplayedAge) return '';

  return formatter(secondsToHumanUnitAgo(diff));
}

// TODO: This is for Storybook/jest.
// Longterm, this should be a utility function that can be imported.
// For the time being, duplication of this function is being avoided.
if (typeof globalThis !== 'undefined') {
  globalThis.timeAgo = timeAgo; // eslint-disable-line no-undef
};
'use strict';

function userData() {
  const { user = null } = document.body.dataset;

  return JSON.parse(user);
};
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * 默认配置
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var FilterCSS = require('cssfilter').FilterCSS;
var getDefaultCSSWhiteList = require('cssfilter').getDefaultWhiteList;
var _ = require('./util');

// 默认白名单
function getDefaultWhiteList () {
  return {
    // // a:      ['target', 'href', 'title'],
    // abbr:   ['title'],
    // address: [],
    // area:   ['shape', 'coords', 'href', 'alt'],
    // article: [],
    // aside:  [],
    // audio:  ['autoplay', 'controls', 'loop', 'preload', 'src'],
    // b:      [],
    // bdi:    ['dir'],
    // bdo:    ['dir'],
    // big:    [],
    // blockquote: ['cite'],
    // br:     [],
    // caption: [],
    // center: [],
    // cite:   [],
    // code:   [],
    // col:    ['align', 'valign', 'span', 'width'],
    // colgroup: ['align', 'valign', 'span', 'width'],
    // dd:     [],
    // del:    ['datetime'],
    // details: ['open'],
    // div:    [],
    // dl:     [],
    // dt:     [],
    // em:     [],
    // font:   ['color', 'size', 'face'],
    // footer: [],
    // h1:     [],
    // h2:     [],
    // h3:     [],
    // h4:     [],
    // h5:     [],
    // h6:     [],
    // header: [],
    // hr:     [],
    // i:      [],
    // // img:    ['src', 'alt', 'title', 'width', 'height'],
    // ins:    ['datetime'],
    // li:     [],
    // mark:   [],
    // nav:    [],
    // ol:     [],
    // p:      [],
    // pre:    [],
    // s:      [],
    // section:[],
    // small:  [],
    // span:   [],
    // sub:    [],
    // sup:    [],
    // strong: [],
    // table:  ['width', 'border', 'align', 'valign'],
    // tbody:  ['align', 'valign'],
    // td:     ['width', 'rowspan', 'colspan', 'align', 'valign'],
    // tfoot:  ['align', 'valign'],
    // th:     ['width', 'rowspan', 'colspan', 'align', 'valign'],
    // thead:  ['align', 'valign'],
    // tr:     ['rowspan', 'align', 'valign'],
    // tt:     [],
    // u:      [],
    // ul:     [],
    // video:  ['autoplay', 'controls', 'loop', 'preload', 'src', 'height', 'width']
  };
}

// 默认CSS Filter
var defaultCSSFilter = new FilterCSS();

/**
 * 匹配到标签时的处理方法
 *
 * @param {String} tag
 * @param {String} html
 * @param {Object} options
 * @return {String}
 */
function onTag (tag, html, options) {
  // do nothing
}

/**
 * 匹配到不在白名单上的标签时的处理方法
 *
 * @param {String} tag
 * @param {String} html
 * @param {Object} options
 * @return {String}
 */
function onIgnoreTag (tag, html, options) {
  // do nothing
}

/**
 * 匹配到标签属性时的处理方法
 *
 * @param {String} tag
 * @param {String} name
 * @param {String} value
 * @return {String}
 */
function onTagAttr (tag, name, value) {
  // do nothing
}

/**
 * 匹配到不在白名单上的标签属性时的处理方法
 *
 * @param {String} tag
 * @param {String} name
 * @param {String} value
 * @return {String}
 */
function onIgnoreTagAttr (tag, name, value) {
  // do nothing
}

/**
 * HTML转义
 *
 * @param {String} html
 */
function escapeHtml (html) {
  return html.replace(REGEXP_LT, '&lt;').replace(REGEXP_GT, '&gt;');
}

/**
 * 安全的标签属性值
 *
 * @param {String} tag
 * @param {String} name
 * @param {String} value
 * @param {Object} cssFilter
 * @return {String}
 */
function safeAttrValue (tag, name, value, cssFilter) {
  // 转换为友好的属性值，再做判断
  value = friendlyAttrValue(value);

  if (name === 'href' || name === 'src') {
    // 过滤 href 和 src 属性
    // 仅允许 http:// | https:// | mailto: | / | # 开头的地址
    value = _.trim(value);
    if (value === '#') return '#';
    if (!(value.substr(0, 7) === 'http://' ||
         value.substr(0, 8) === 'https://' ||
         value.substr(0, 7) === 'mailto:' ||
         value[0] === '#' ||
         value[0] === '/')) {
      return '';
    }
  } else if (name === 'background') {
    // 过滤 background 属性 （这个xss漏洞较老了，可能已经不适用）
    // javascript:
    REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)) {
      return '';
    }
  } else if (name === 'style') {
    // /*注释*/
    /*REGEXP_DEFAULT_ON_TAG_ATTR_3.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_3.test(value)) {
      return '';
    }*/
    // expression()
    REGEXP_DEFAULT_ON_TAG_ATTR_7.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_7.test(value)) {
      return '';
    }
    // url()
    REGEXP_DEFAULT_ON_TAG_ATTR_8.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_8.test(value)) {
      REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex = 0;
      if (REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)) {
        return '';
      }
    }
    if (cssFilter !== false) {
      cssFilter = cssFilter || defaultCSSFilter;
      value = cssFilter.process(value);
    }
  }

  // 输出时需要转义<>"
  value = escapeAttrValue(value);
  return value;
}

// 正则表达式
var REGEXP_LT = /</g;
var REGEXP_GT = />/g;
var REGEXP_QUOTE = /"/g;
var REGEXP_QUOTE_2 = /&quot;/g;
var REGEXP_ATTR_VALUE_1 = /&#([a-zA-Z0-9]*);?/img;
var REGEXP_ATTR_VALUE_COLON = /&colon;?/img;
var REGEXP_ATTR_VALUE_NEWLINE = /&newline;?/img;
var REGEXP_DEFAULT_ON_TAG_ATTR_3 = /\/\*|\*\//mg;
var REGEXP_DEFAULT_ON_TAG_ATTR_4 = /((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a)\:/ig;
var REGEXP_DEFAULT_ON_TAG_ATTR_5 = /^[\s"'`]*(d\s*a\s*t\s*a\s*)\:/ig;
var REGEXP_DEFAULT_ON_TAG_ATTR_6 = /^[\s"'`]*(d\s*a\s*t\s*a\s*)\:\s*image\//ig;
var REGEXP_DEFAULT_ON_TAG_ATTR_7 = /e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/ig;
var REGEXP_DEFAULT_ON_TAG_ATTR_8 = /u\s*r\s*l\s*\(.*/ig;

/**
 * 对双引号进行转义
 *
 * @param {String} str
 * @return {String} str
 */
function escapeQuote (str) {
  return str.replace(REGEXP_QUOTE, '&quot;');
}

/**
 * 对双引号进行转义
 *
 * @param {String} str
 * @return {String} str
 */
function unescapeQuote (str) {
  return str.replace(REGEXP_QUOTE_2, '"');
}

/**
 * 对html实体编码进行转义
 *
 * @param {String} str
 * @return {String}
 */
function escapeHtmlEntities (str) {
  return str.replace(REGEXP_ATTR_VALUE_1, function replaceUnicode (str, code) {
    return (code[0] === 'x' || code[0] === 'X')
            ? String.fromCharCode(parseInt(code.substr(1), 16))
            : String.fromCharCode(parseInt(code, 10));
  });
}

/**
 * 对html5新增的危险实体编码进行转义
 *
 * @param {String} str
 * @return {String}
 */
function escapeDangerHtml5Entities (str) {
  return str.replace(REGEXP_ATTR_VALUE_COLON, ':')
            .replace(REGEXP_ATTR_VALUE_NEWLINE, ' ');
}

/**
 * 清除不可见字符
 *
 * @param {String} str
 * @return {String}
 */
function clearNonPrintableCharacter (str) {
  var str2 = '';
  for (var i = 0, len = str.length; i < len; i++) {
    str2 += str.charCodeAt(i) < 32 ? ' ' : str.charAt(i);
  }
  return _.trim(str2);
}

/**
 * 将标签的属性值转换成一般字符，便于分析
 *
 * @param {String} str
 * @return {String}
 */
function friendlyAttrValue (str) {
  str = unescapeQuote(str);             // 双引号
  str = escapeHtmlEntities(str);         // 转换HTML实体编码
  str = escapeDangerHtml5Entities(str);  // 转换危险的HTML5新增实体编码
  str = clearNonPrintableCharacter(str); // 清除不可见字符
  return str;
}

/**
 * 转义用于输出的标签属性值
 *
 * @param {String} str
 * @return {String}
 */
function escapeAttrValue (str) {
  str = escapeQuote(str);
  str = escapeHtml(str);
  return str;
}

/**
 * 去掉不在白名单中的标签onIgnoreTag处理方法
 */
function onIgnoreTagStripAll () {
  return '';
}

/**
 * 删除标签体
 *
 * @param {array} tags 要删除的标签列表
 * @param {function} next 对不在列表中的标签的处理函数，可选
 */
function StripTagBody (tags, next) {
  if (typeof(next) !== 'function') {
    next = function () {};
  }

  var isRemoveAllTag = !Array.isArray(tags);
  function isRemoveTag (tag) {
    if (isRemoveAllTag) return true;
    return (_.indexOf(tags, tag) !== -1);
  }

  var removeList = [];   // 要删除的位置范围列表
  var posStart = false;  // 当前标签开始位置

  return {
    onIgnoreTag: function (tag, html, options) {
      if (isRemoveTag(tag)) {
        if (options.isClosing) {
          var ret = '[/removed]';
          var end = options.position + ret.length;
          removeList.push([posStart !== false ? posStart : options.position, end]);
          posStart = false;
          return ret;
        } else {
          if (!posStart) {
            posStart = options.position;
          }
          return '[removed]';
        }
      } else {
        return next(tag, html, options);
      }
    },
    remove: function (html) {
      var rethtml = '';
      var lastPos = 0;
      _.forEach(removeList, function (pos) {
        rethtml += html.slice(lastPos, pos[0]);
        lastPos = pos[1];
      });
      rethtml += html.slice(lastPos);
      return rethtml;
    }
  };
}

/**
 * 去除备注标签
 *
 * @param {String} html
 * @return {String}
 */
function stripCommentTag (html) {
  return html.replace(STRIP_COMMENT_TAG_REGEXP, '');
}
var STRIP_COMMENT_TAG_REGEXP = /<!--[\s\S]*?-->/g;

/**
 * 去除不可见字符
 *
 * @param {String} html
 * @return {String}
 */
function stripBlankChar (html) {
  var chars = html.split('');
  chars = chars.filter(function (char) {
    var c = char.charCodeAt(0);
    if (c === 127) return false;
    if (c <= 31) {
      if (c === 10 || c === 13) return true;
      return false;
    }
    return true;
  });
  return chars.join('');
}


exports.whiteList = getDefaultWhiteList();
exports.getDefaultWhiteList = getDefaultWhiteList;
exports.onTag = onTag;
exports.onIgnoreTag = onIgnoreTag;
exports.onTagAttr = onTagAttr;
exports.onIgnoreTagAttr = onIgnoreTagAttr;
exports.safeAttrValue = safeAttrValue;
exports.escapeHtml = escapeHtml;
exports.escapeQuote = escapeQuote;
exports.unescapeQuote = unescapeQuote;
exports.escapeHtmlEntities = escapeHtmlEntities;
exports.escapeDangerHtml5Entities = escapeDangerHtml5Entities;
exports.clearNonPrintableCharacter = clearNonPrintableCharacter;
exports.friendlyAttrValue = friendlyAttrValue;
exports.escapeAttrValue = escapeAttrValue;
exports.onIgnoreTagStripAll = onIgnoreTagStripAll;
exports.StripTagBody = StripTagBody;
exports.stripCommentTag = stripCommentTag;
exports.stripBlankChar = stripBlankChar;
exports.cssFilter = defaultCSSFilter;
exports.getDefaultCSSWhiteList = getDefaultCSSWhiteList;

},{"./util":4,"cssfilter":8}],2:[function(require,module,exports){
/**
 * 模块入口
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var DEFAULT = require('./default');
var parser = require('./parser');
var FilterXSS = require('./xss');


/**
 * XSS过滤
 *
 * @param {String} html 要过滤的HTML代码
 * @param {Object} options 选项：whiteList, onTag, onTagAttr, onIgnoreTag, onIgnoreTagAttr, safeAttrValue, escapeHtml
 * @return {String}
 */
function filterXSS (html, options) {
  var xss = new FilterXSS(options);
  return xss.process(html);
}


// 输出
exports = module.exports = filterXSS;
exports.FilterXSS = FilterXSS;
for (var i in DEFAULT) exports[i] = DEFAULT[i];
for (var i in parser) exports[i] = parser[i];


// 在浏览器端使用
if (typeof window !== 'undefined') {
  window.filterXSS = module.exports;
}

},{"./default":1,"./parser":3,"./xss":5}],3:[function(require,module,exports){
/**
 * 简单 HTML Parser
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var _ = require('./util');

/**
 * 获取标签的名称
 *
 * @param {String} html 如：'<a hef="#">'
 * @return {String}
 */
function getTagName (html) {
  var i = html.indexOf(' ');
  if (i === -1) {
    var tagName = html.slice(1, -1);
  } else {
    var tagName = html.slice(1, i + 1);
  }
  tagName = _.trim(tagName).toLowerCase();
  if (tagName.slice(0, 1) === '/') tagName = tagName.slice(1);
  if (tagName.slice(-1) === '/') tagName = tagName.slice(0, -1);
  return tagName;
}

/**
 * 是否为闭合标签
 *
 * @param {String} html 如：'<a hef="#">'
 * @return {Boolean}
 */
function isClosing (html) {
  return (html.slice(0, 2) === '</');
}

/**
 * 分析HTML代码，调用相应的函数处理，返回处理后的HTML
 *
 * @param {String} html
 * @param {Function} onTag 处理标签的函数
 *   参数格式： function (sourcePosition, position, tag, html, isClosing)
 * @param {Function} escapeHtml 对HTML进行转义的函数
 * @return {String}
 */
function parseTag (html, onTag, escapeHtml) {
  'user strict';

  var rethtml = '';        // 待返回的HTML
  var lastPos = 0;         // 上一个标签结束位置
  var tagStart = false;    // 当前标签开始位置
  var quoteStart = false;  // 引号开始位置
  var currentPos = 0;      // 当前位置
  var len = html.length;   // HTML长度
  var currentHtml = '';    // 当前标签的HTML代码
  var currentTagName = ''; // 当前标签的名称

  // 逐个分析字符
  for (currentPos = 0; currentPos < len; currentPos++) {
    var c = html.charAt(currentPos);
    if (tagStart === false) {
      if (c === '<') {
        tagStart = currentPos;
        continue;
      }
    } else {
      if (quoteStart === false) {
        if (c === '<') {
          rethtml += escapeHtml(html.slice(lastPos, currentPos));
          tagStart = currentPos;
          lastPos = currentPos;
          continue;
        }
        if (c === '>') {
          rethtml += escapeHtml(html.slice(lastPos, tagStart));
          currentHtml = html.slice(tagStart, currentPos + 1);
          currentTagName = getTagName(currentHtml);
          rethtml += onTag(tagStart,
                           rethtml.length,
                           currentTagName,
                           currentHtml,
                           isClosing(currentHtml));
          lastPos = currentPos + 1;
          tagStart = false;
          continue;
        }
        // HTML标签内的引号仅当前一个字符是等于号时才有效
        if ((c === '"' || c === "'") && html.charAt(currentPos - 1) === '=') {
          quoteStart = c;
          continue;
        }
      } else {
        if (c === quoteStart) {
          quoteStart = false;
          continue;
        }
      }
    }
  }
  if (lastPos < html.length) {
    rethtml += escapeHtml(html.substr(lastPos));
  }

  return rethtml;
}

// 不符合属性名称规则的正则表达式
var REGEXP_ATTR_NAME = /[^a-zA-Z0-9_:\.\-]/img;

/**
 * 分析标签HTML代码，调用相应的函数处理，返回HTML
 *
 * @param {String} html 如标签'<a href="#" target="_blank">' 则为 'href="#" target="_blank"'
 * @param {Function} onAttr 处理属性值的函数
 *   函数格式： function (name, value)
 * @return {String}
 */
function parseAttr (html, onAttr) {
  'user strict';

  var lastPos = 0;        // 当前位置
  var retAttrs = [];      // 待返回的属性列表
  var tmpName = false;    // 临时属性名称
  var len = html.length;  // HTML代码长度

  function addAttr (name, value) {
    name = _.trim(name);
    name = name.replace(REGEXP_ATTR_NAME, '').toLowerCase();
    if (name.length < 1) return;
    var ret = onAttr(name, value || '');
    if (ret) retAttrs.push(ret);
  };

  // 逐个分析字符
  for (var i = 0; i < len; i++) {
    var c = html.charAt(i);
    var v, j;
    if (tmpName === false && c === '=') {
      tmpName = html.slice(lastPos, i);
      lastPos = i + 1;
      continue;
    }
    if (tmpName !== false) {
      // HTML标签内的引号仅当前一个字符是等于号时才有效
      if (i === lastPos && (c === '"' || c === "'") && html.charAt(i - 1) === '=') {
        j = html.indexOf(c, i + 1);
        if (j === -1) {
          break;
        } else {
          v = _.trim(html.slice(lastPos + 1, j));
          addAttr(tmpName, v);
          tmpName = false;
          i = j;
          lastPos = i + 1;
          continue;
        }
      }
    }
    if (c === ' ') {
      if (tmpName === false) {
        j = findNextEqual(html, i);
        if (j === -1) {
          v = _.trim(html.slice(lastPos, i));
          addAttr(v);
          tmpName = false;
          lastPos = i + 1;
          continue;
        } else {
          i = j - 1;
          continue;
        }
      } else {
        j = findBeforeEqual(html, i - 1);
        if (j === -1) {
          v = _.trim(html.slice(lastPos, i));
          v = stripQuoteWrap(v);
          addAttr(tmpName, v);
          tmpName = false;
          lastPos = i + 1;
          continue;
        } else {
          continue;
        }
      }
    }
  }

  if (lastPos < html.length) {
    if (tmpName === false) {
      addAttr(html.slice(lastPos));
    } else {
      addAttr(tmpName, stripQuoteWrap(_.trim(html.slice(lastPos))));
    }
  }

  return _.trim(retAttrs.join(' '));
}

function findNextEqual (str, i) {
  for (; i < str.length; i++) {
    var c = str[i];
    if (c === ' ') continue;
    if (c === '=') return i;
    return -1;
  }
}

function findBeforeEqual (str, i) {
  for (; i > 0; i--) {
    var c = str[i];
    if (c === ' ') continue;
    if (c === '=') return i;
    return -1;
  }
}

function isQuoteWrapString (text) {
  if ((text[0] === '"' && text[text.length - 1] === '"') ||
      (text[0] === '\'' && text[text.length - 1] === '\'')) {
    return true;
  } else {
    return false;
  }
};

function stripQuoteWrap (text) {
  if (isQuoteWrapString(text)) {
    return text.substr(1, text.length - 2);
  } else {
    return text;
  }
};


exports.parseTag = parseTag;
exports.parseAttr = parseAttr;

},{"./util":4}],4:[function(require,module,exports){
module.exports = {
  indexOf: function (arr, item) {
    var i, j;
    if (Array.prototype.indexOf) {
      return arr.indexOf(item);
    }
    for (i = 0, j = arr.length; i < j; i++) {
      if (arr[i] === item) {
        return i;
      }
    }
    return -1;
  },
  forEach: function (arr, fn, scope) {
    var i, j;
    if (Array.prototype.forEach) {
      return arr.forEach(fn, scope);
    }
    for (i = 0, j = arr.length; i < j; i++) {
      fn.call(scope, arr[i], i, arr);
    }
  },
  trim: function (str) {
    if (String.prototype.trim) {
      return str.trim();
    }
    return str.replace(/(^\s*)|(\s*$)/g, '');
  }
};

},{}],5:[function(require,module,exports){
/**
 * 过滤XSS
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var FilterCSS = require('cssfilter').FilterCSS;
var DEFAULT = require('./default');
var parser = require('./parser');
var parseTag = parser.parseTag;
var parseAttr = parser.parseAttr;
var _ = require('./util');


/**
 * 返回值是否为空
 *
 * @param {Object} obj
 * @return {Boolean}
 */
function isNull (obj) {
  return (obj === undefined || obj === null);
}

/**
 * 取标签内的属性列表字符串
 *
 * @param {String} html
 * @return {Object}
 *   - {String} html
 *   - {Boolean} closing
 */
function getAttrs (html) {
  var i = html.indexOf(' ');
  if (i === -1) {
    return {
      html:    '',
      closing: (html[html.length - 2] === '/')
    };
  }
  html = _.trim(html.slice(i + 1, -1));
  var isClosing = (html[html.length - 1] === '/');
  if (isClosing) html = _.trim(html.slice(0, -1));
  return {
    html:    html,
    closing: isClosing
  };
}

/**
 * 浅拷贝对象
 *
 * @param {Object} obj
 * @return {Object}
 */
function shallowCopyObject (obj) {
  var ret = {};
  for (var i in obj) {
    ret[i] = obj[i];
  }
  return ret;
}

/**
 * XSS过滤对象
 *
 * @param {Object} options
 *   选项：whiteList, onTag, onTagAttr, onIgnoreTag,
 *        onIgnoreTagAttr, safeAttrValue, escapeHtml
 *        stripIgnoreTagBody, allowCommentTag, stripBlankChar
 *        css{whiteList, onAttr, onIgnoreAttr} css=false表示禁用cssfilter
 */
function FilterXSS (options) {
  options = shallowCopyObject(options || {});

  if (options.stripIgnoreTag) {
    if (options.onIgnoreTag) {
      console.error('Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time');
    }
    options.onIgnoreTag = DEFAULT.onIgnoreTagStripAll;
  }

  options.whiteList = options.whiteList || DEFAULT.whiteList;
  options.onTag = options.onTag || DEFAULT.onTag;
  options.onTagAttr = options.onTagAttr || DEFAULT.onTagAttr;
  options.onIgnoreTag = options.onIgnoreTag || DEFAULT.onIgnoreTag;
  options.onIgnoreTagAttr = options.onIgnoreTagAttr || DEFAULT.onIgnoreTagAttr;
  options.safeAttrValue = options.safeAttrValue || DEFAULT.safeAttrValue;
  options.escapeHtml = options.escapeHtml || DEFAULT.escapeHtml;
  this.options = options;

  if (options.css === false) {
    this.cssFilter = false;
  } else {
    options.css = options.css || {};
    this.cssFilter = new FilterCSS(options.css);
  }
}

/**
 * 开始处理
 *
 * @param {String} html
 * @return {String}
 */
FilterXSS.prototype.process = function (html) {
  // 兼容各种奇葩输入
  html = html || '';
  html = html.toString();
  if (!html) return '';

  var me = this;
  var options = me.options;
  var whiteList = options.whiteList;
  var onTag = options.onTag;
  var onIgnoreTag = options.onIgnoreTag;
  var onTagAttr = options.onTagAttr;
  var onIgnoreTagAttr = options.onIgnoreTagAttr;
  var safeAttrValue = options.safeAttrValue;
  var escapeHtml = options.escapeHtml;
  var cssFilter = me.cssFilter;

  // 是否清除不可见字符
  if (options.stripBlankChar) {
    html = DEFAULT.stripBlankChar(html);
  }

  // 是否禁止备注标签
  if (!options.allowCommentTag) {
    html = DEFAULT.stripCommentTag(html);
  }

  // 如果开启了stripIgnoreTagBody
  var stripIgnoreTagBody = false;
  if (options.stripIgnoreTagBody) {
    var stripIgnoreTagBody = DEFAULT.StripTagBody(options.stripIgnoreTagBody, onIgnoreTag);
    onIgnoreTag = stripIgnoreTagBody.onIgnoreTag;
  }

  var retHtml = parseTag(html, function (sourcePosition, position, tag, html, isClosing) {
    var info = {
      sourcePosition: sourcePosition,
      position:       position,
      isClosing:      isClosing,
      isWhite:        (tag in whiteList)
    };

    // 调用onTag处理
    var ret = onTag(tag, html, info);
    if (!isNull(ret)) return ret;

    // 默认标签处理方法
    if (info.isWhite) {
      // 白名单标签，解析标签属性
      // 如果是闭合标签，则不需要解析属性
      if (info.isClosing) {
        return '</' + tag + '>';
      }

      var attrs = getAttrs(html);
      var whiteAttrList = whiteList[tag];
      var attrsHtml = parseAttr(attrs.html, function (name, value) {

        // 调用onTagAttr处理
        var isWhiteAttr = (_.indexOf(whiteAttrList, name) !== -1);
        var ret = onTagAttr(tag, name, value, isWhiteAttr);
        if (!isNull(ret)) return ret;

        // 默认的属性处理方法
        if (isWhiteAttr) {
          // 白名单属性，调用safeAttrValue过滤属性值
          value = safeAttrValue(tag, name, value, cssFilter);
          if (value) {
            return name + '="' + value + '"';
          } else {
            return name;
          }
        } else {
          // 非白名单属性，调用onIgnoreTagAttr处理
          var ret = onIgnoreTagAttr(tag, name, value, isWhiteAttr);
          if (!isNull(ret)) return ret;
          return;
        }
      });

      // 构造新的标签代码
      var html = '<' + tag;
      if (attrsHtml) html += ' ' + attrsHtml;
      if (attrs.closing) html += ' /';
      html += '>';
      return html;

    } else {
      // 非白名单标签，调用onIgnoreTag处理
      var ret = onIgnoreTag(tag, html, info);
      if (!isNull(ret)) return ret;
      return escapeHtml(html);
    }

  }, escapeHtml);

  // 如果开启了stripIgnoreTagBody，需要对结果再进行处理
  if (stripIgnoreTagBody) {
    retHtml = stripIgnoreTagBody.remove(retHtml);
  }

  return retHtml;
};


module.exports = FilterXSS;

},{"./default":1,"./parser":3,"./util":4,"cssfilter":8}],6:[function(require,module,exports){
/**
 * cssfilter
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var DEFAULT = require('./default');
var parseStyle = require('./parser');
var _ = require('./util');


/**
 * 返回值是否为空
 *
 * @param {Object} obj
 * @return {Boolean}
 */
function isNull (obj) {
  return (obj === undefined || obj === null);
}

/**
 * 浅拷贝对象
 *
 * @param {Object} obj
 * @return {Object}
 */
function shallowCopyObject (obj) {
  var ret = {};
  for (var i in obj) {
    ret[i] = obj[i];
  }
  return ret;
}

/**
 * 创建CSS过滤器
 *
 * @param {Object} options
 *   - {Object} whiteList
 *   - {Object} onAttr
 *   - {Object} onIgnoreAttr
 */
function FilterCSS (options) {
  options = shallowCopyObject(options || {});
  options.whiteList = options.whiteList || DEFAULT.whiteList;
  options.onAttr = options.onAttr || DEFAULT.onAttr;
  options.onIgnoreAttr = options.onIgnoreAttr || DEFAULT.onIgnoreAttr;
  this.options = options;
}

FilterCSS.prototype.process = function (css) {
  // 兼容各种奇葩输入
  css = css || '';
  css = css.toString();
  if (!css) return '';

  var me = this;
  var options = me.options;
  var whiteList = options.whiteList;
  var onAttr = options.onAttr;
  var onIgnoreAttr = options.onIgnoreAttr;

  var retCSS = parseStyle(css, function (sourcePosition, position, name, value, source) {

    var check = whiteList[name];
    var isWhite = false;
    if (check === true) isWhite = check;
    else if (typeof check === 'function') isWhite = check(value);
    else if (check instanceof RegExp) isWhite = check.test(value);
    if (isWhite !== true) isWhite = false;

    var opts = {
      position: position,
      sourcePosition: sourcePosition,
      source: source,
      isWhite: isWhite
    };

    if (isWhite) {

      var ret = onAttr(name, value, opts);
      if (isNull(ret)) {
        return name + ':' + value;
      } else {
        return ret;
      }

    } else {

      var ret = onIgnoreAttr(name, value, opts);
      if (!isNull(ret)) {
        return ret;
      }

    }
  });

  return retCSS;
};


module.exports = FilterCSS;

},{"./default":7,"./parser":9,"./util":10}],7:[function(require,module,exports){
/**
 * cssfilter
 *
 * @author 老雷<leizongmin@gmail.com>
 */

function getDefaultWhiteList () {
  // 白名单值说明：
  // true: 允许该属性
  // Function: function (val) { } 返回true表示允许该属性，其他值均表示不允许
  // RegExp: regexp.test(val) 返回true表示允许该属性，其他值均表示不允许
  // 除上面列出的值外均表示不允许
  var whiteList = {};

  whiteList['align-content'] = false; // default: auto
  whiteList['align-items'] = false; // default: auto
  whiteList['align-self'] = false; // default: auto
  whiteList['alignment-adjust'] = false; // default: auto
  whiteList['alignment-baseline'] = false; // default: baseline
  whiteList['all'] = false; // default: depending on individual properties
  whiteList['anchor-point'] = false; // default: none
  whiteList['animation'] = false; // default: depending on individual properties
  whiteList['animation-delay'] = false; // default: 0
  whiteList['animation-direction'] = false; // default: normal
  whiteList['animation-duration'] = false; // default: 0
  whiteList['animation-fill-mode'] = false; // default: none
  whiteList['animation-iteration-count'] = false; // default: 1
  whiteList['animation-name'] = false; // default: none
  whiteList['animation-play-state'] = false; // default: running
  whiteList['animation-timing-function'] = false; // default: ease
  whiteList['azimuth'] = false; // default: center
  whiteList['backface-visibility'] = false; // default: visible
  whiteList['background'] = true; // default: depending on individual properties
  whiteList['background-attachment'] = true; // default: scroll
  whiteList['background-clip'] = true; // default: border-box
  whiteList['background-color'] = true; // default: transparent
  whiteList['background-image'] = true; // default: none
  whiteList['background-origin'] = true; // default: padding-box
  whiteList['background-position'] = true; // default: 0% 0%
  whiteList['background-repeat'] = true; // default: repeat
  whiteList['background-size'] = true; // default: auto
  whiteList['baseline-shift'] = false; // default: baseline
  whiteList['binding'] = false; // default: none
  whiteList['bleed'] = false; // default: 6pt
  whiteList['bookmark-label'] = false; // default: content()
  whiteList['bookmark-level'] = false; // default: none
  whiteList['bookmark-state'] = false; // default: open
  whiteList['border'] = true; // default: depending on individual properties
  whiteList['border-bottom'] = true; // default: depending on individual properties
  whiteList['border-bottom-color'] = true; // default: current color
  whiteList['border-bottom-left-radius'] = true; // default: 0
  whiteList['border-bottom-right-radius'] = true; // default: 0
  whiteList['border-bottom-style'] = true; // default: none
  whiteList['border-bottom-width'] = true; // default: medium
  whiteList['border-collapse'] = true; // default: separate
  whiteList['border-color'] = true; // default: depending on individual properties
  whiteList['border-image'] = true; // default: none
  whiteList['border-image-outset'] = true; // default: 0
  whiteList['border-image-repeat'] = true; // default: stretch
  whiteList['border-image-slice'] = true; // default: 100%
  whiteList['border-image-source'] = true; // default: none
  whiteList['border-image-width'] = true; // default: 1
  whiteList['border-left'] = true; // default: depending on individual properties
  whiteList['border-left-color'] = true; // default: current color
  whiteList['border-left-style'] = true; // default: none
  whiteList['border-left-width'] = true; // default: medium
  whiteList['border-radius'] = true; // default: 0
  whiteList['border-right'] = true; // default: depending on individual properties
  whiteList['border-right-color'] = true; // default: current color
  whiteList['border-right-style'] = true; // default: none
  whiteList['border-right-width'] = true; // default: medium
  whiteList['border-spacing'] = true; // default: 0
  whiteList['border-style'] = true; // default: depending on individual properties
  whiteList['border-top'] = true; // default: depending on individual properties
  whiteList['border-top-color'] = true; // default: current color
  whiteList['border-top-left-radius'] = true; // default: 0
  whiteList['border-top-right-radius'] = true; // default: 0
  whiteList['border-top-style'] = true; // default: none
  whiteList['border-top-width'] = true; // default: medium
  whiteList['border-width'] = true; // default: depending on individual properties
  whiteList['bottom'] = false; // default: auto
  whiteList['box-decoration-break'] = true; // default: slice
  whiteList['box-shadow'] = true; // default: none
  whiteList['box-sizing'] = true; // default: content-box
  whiteList['box-snap'] = true; // default: none
  whiteList['box-suppress'] = true; // default: show
  whiteList['break-after'] = true; // default: auto
  whiteList['break-before'] = true; // default: auto
  whiteList['break-inside'] = true; // default: auto
  whiteList['caption-side'] = false; // default: top
  whiteList['chains'] = false; // default: none
  whiteList['clear'] = true; // default: none
  whiteList['clip'] = false; // default: auto
  whiteList['clip-path'] = false; // default: none
  whiteList['clip-rule'] = false; // default: nonzero
  whiteList['color'] = true; // default: implementation dependent
  whiteList['color-interpolation-filters'] = true; // default: auto
  whiteList['column-count'] = false; // default: auto
  whiteList['column-fill'] = false; // default: balance
  whiteList['column-gap'] = false; // default: normal
  whiteList['column-rule'] = false; // default: depending on individual properties
  whiteList['column-rule-color'] = false; // default: current color
  whiteList['column-rule-style'] = false; // default: medium
  whiteList['column-rule-width'] = false; // default: medium
  whiteList['column-span'] = false; // default: none
  whiteList['column-width'] = false; // default: auto
  whiteList['columns'] = false; // default: depending on individual properties
  whiteList['contain'] = false; // default: none
  whiteList['content'] = false; // default: normal
  whiteList['counter-increment'] = false; // default: none
  whiteList['counter-reset'] = false; // default: none
  whiteList['counter-set'] = false; // default: none
  whiteList['crop'] = false; // default: auto
  whiteList['cue'] = false; // default: depending on individual properties
  whiteList['cue-after'] = false; // default: none
  whiteList['cue-before'] = false; // default: none
  whiteList['cursor'] = false; // default: auto
  whiteList['direction'] = false; // default: ltr
  whiteList['display'] = true; // default: depending on individual properties
  whiteList['display-inside'] = true; // default: auto
  whiteList['display-list'] = true; // default: none
  whiteList['display-outside'] = true; // default: inline-level
  whiteList['dominant-baseline'] = false; // default: auto
  whiteList['elevation'] = false; // default: level
  whiteList['empty-cells'] = false; // default: show
  whiteList['filter'] = false; // default: none
  whiteList['flex'] = false; // default: depending on individual properties
  whiteList['flex-basis'] = false; // default: auto
  whiteList['flex-direction'] = false; // default: row
  whiteList['flex-flow'] = false; // default: depending on individual properties
  whiteList['flex-grow'] = false; // default: 0
  whiteList['flex-shrink'] = false; // default: 1
  whiteList['flex-wrap'] = false; // default: nowrap
  whiteList['float'] = false; // default: none
  whiteList['float-offset'] = false; // default: 0 0
  whiteList['flood-color'] = false; // default: black
  whiteList['flood-opacity'] = false; // default: 1
  whiteList['flow-from'] = false; // default: none
  whiteList['flow-into'] = false; // default: none
  whiteList['font'] = true; // default: depending on individual properties
  whiteList['font-family'] = true; // default: implementation dependent
  whiteList['font-feature-settings'] = true; // default: normal
  whiteList['font-kerning'] = true; // default: auto
  whiteList['font-language-override'] = true; // default: normal
  whiteList['font-size'] = true; // default: medium
  whiteList['font-size-adjust'] = true; // default: none
  whiteList['font-stretch'] = true; // default: normal
  whiteList['font-style'] = true; // default: normal
  whiteList['font-synthesis'] = true; // default: weight style
  whiteList['font-variant'] = true; // default: normal
  whiteList['font-variant-alternates'] = true; // default: normal
  whiteList['font-variant-caps'] = true; // default: normal
  whiteList['font-variant-east-asian'] = true; // default: normal
  whiteList['font-variant-ligatures'] = true; // default: normal
  whiteList['font-variant-numeric'] = true; // default: normal
  whiteList['font-variant-position'] = true; // default: normal
  whiteList['font-weight'] = true; // default: normal
  whiteList['grid'] = false; // default: depending on individual properties
  whiteList['grid-area'] = false; // default: depending on individual properties
  whiteList['grid-auto-columns'] = false; // default: auto
  whiteList['grid-auto-flow'] = false; // default: none
  whiteList['grid-auto-rows'] = false; // default: auto
  whiteList['grid-column'] = false; // default: depending on individual properties
  whiteList['grid-column-end'] = false; // default: auto
  whiteList['grid-column-start'] = false; // default: auto
  whiteList['grid-row'] = false; // default: depending on individual properties
  whiteList['grid-row-end'] = false; // default: auto
  whiteList['grid-row-start'] = false; // default: auto
  whiteList['grid-template'] = false; // default: depending on individual properties
  whiteList['grid-template-areas'] = false; // default: none
  whiteList['grid-template-columns'] = false; // default: none
  whiteList['grid-template-rows'] = false; // default: none
  whiteList['hanging-punctuation'] = false; // default: none
  whiteList['height'] = true; // default: auto
  whiteList['hyphens'] = false; // default: manual
  whiteList['icon'] = false; // default: auto
  whiteList['image-orientation'] = false; // default: auto
  whiteList['image-resolution'] = false; // default: normal
  whiteList['ime-mode'] = false; // default: auto
  whiteList['initial-letters'] = false; // default: normal
  whiteList['inline-box-align'] = false; // default: last
  whiteList['justify-content'] = false; // default: auto
  whiteList['justify-items'] = false; // default: auto
  whiteList['justify-self'] = false; // default: auto
  whiteList['left'] = false; // default: auto
  whiteList['letter-spacing'] = true; // default: normal
  whiteList['lighting-color'] = true; // default: white
  whiteList['line-box-contain'] = false; // default: block inline replaced
  whiteList['line-break'] = false; // default: auto
  whiteList['line-grid'] = false; // default: match-parent
  whiteList['line-height'] = false; // default: normal
  whiteList['line-snap'] = false; // default: none
  whiteList['line-stacking'] = false; // default: depending on individual properties
  whiteList['line-stacking-ruby'] = false; // default: exclude-ruby
  whiteList['line-stacking-shift'] = false; // default: consider-shifts
  whiteList['line-stacking-strategy'] = false; // default: inline-line-height
  whiteList['list-style'] = true; // default: depending on individual properties
  whiteList['list-style-image'] = true; // default: none
  whiteList['list-style-position'] = true; // default: outside
  whiteList['list-style-type'] = true; // default: disc
  whiteList['margin'] = true; // default: depending on individual properties
  whiteList['margin-bottom'] = true; // default: 0
  whiteList['margin-left'] = true; // default: 0
  whiteList['margin-right'] = true; // default: 0
  whiteList['margin-top'] = true; // default: 0
  whiteList['marker-offset'] = false; // default: auto
  whiteList['marker-side'] = false; // default: list-item
  whiteList['marks'] = false; // default: none
  whiteList['mask'] = false; // default: border-box
  whiteList['mask-box'] = false; // default: see individual properties
  whiteList['mask-box-outset'] = false; // default: 0
  whiteList['mask-box-repeat'] = false; // default: stretch
  whiteList['mask-box-slice'] = false; // default: 0 fill
  whiteList['mask-box-source'] = false; // default: none
  whiteList['mask-box-width'] = false; // default: auto
  whiteList['mask-clip'] = false; // default: border-box
  whiteList['mask-image'] = false; // default: none
  whiteList['mask-origin'] = false; // default: border-box
  whiteList['mask-position'] = false; // default: center
  whiteList['mask-repeat'] = false; // default: no-repeat
  whiteList['mask-size'] = false; // default: border-box
  whiteList['mask-source-type'] = false; // default: auto
  whiteList['mask-type'] = false; // default: luminance
  whiteList['max-height'] = true; // default: none
  whiteList['max-lines'] = false; // default: none
  whiteList['max-width'] = true; // default: none
  whiteList['min-height'] = true; // default: 0
  whiteList['min-width'] = true; // default: 0
  whiteList['move-to'] = false; // default: normal
  whiteList['nav-down'] = false; // default: auto
  whiteList['nav-index'] = false; // default: auto
  whiteList['nav-left'] = false; // default: auto
  whiteList['nav-right'] = false; // default: auto
  whiteList['nav-up'] = false; // default: auto
  whiteList['object-fit'] = false; // default: fill
  whiteList['object-position'] = false; // default: 50% 50%
  whiteList['opacity'] = false; // default: 1
  whiteList['order'] = false; // default: 0
  whiteList['orphans'] = false; // default: 2
  whiteList['outline'] = false; // default: depending on individual properties
  whiteList['outline-color'] = false; // default: invert
  whiteList['outline-offset'] = false; // default: 0
  whiteList['outline-style'] = false; // default: none
  whiteList['outline-width'] = false; // default: medium
  whiteList['overflow'] = false; // default: depending on individual properties
  whiteList['overflow-wrap'] = false; // default: normal
  whiteList['overflow-x'] = false; // default: visible
  whiteList['overflow-y'] = false; // default: visible
  whiteList['padding'] = true; // default: depending on individual properties
  whiteList['padding-bottom'] = true; // default: 0
  whiteList['padding-left'] = true; // default: 0
  whiteList['padding-right'] = true; // default: 0
  whiteList['padding-top'] = true; // default: 0
  whiteList['page'] = false; // default: auto
  whiteList['page-break-after'] = false; // default: auto
  whiteList['page-break-before'] = false; // default: auto
  whiteList['page-break-inside'] = false; // default: auto
  whiteList['page-policy'] = false; // default: start
  whiteList['pause'] = false; // default: implementation dependent
  whiteList['pause-after'] = false; // default: implementation dependent
  whiteList['pause-before'] = false; // default: implementation dependent
  whiteList['perspective'] = false; // default: none
  whiteList['perspective-origin'] = false; // default: 50% 50%
  whiteList['pitch'] = false; // default: medium
  whiteList['pitch-range'] = false; // default: 50
  whiteList['play-during'] = false; // default: auto
  whiteList['position'] = false; // default: static
  whiteList['presentation-level'] = false; // default: 0
  whiteList['quotes'] = false; // default: text
  whiteList['region-fragment'] = false; // default: auto
  whiteList['resize'] = false; // default: none
  whiteList['rest'] = false; // default: depending on individual properties
  whiteList['rest-after'] = false; // default: none
  whiteList['rest-before'] = false; // default: none
  whiteList['richness'] = false; // default: 50
  whiteList['right'] = false; // default: auto
  whiteList['rotation'] = false; // default: 0
  whiteList['rotation-point'] = false; // default: 50% 50%
  whiteList['ruby-align'] = false; // default: auto
  whiteList['ruby-merge'] = false; // default: separate
  whiteList['ruby-position'] = false; // default: before
  whiteList['shape-image-threshold'] = false; // default: 0.0
  whiteList['shape-outside'] = false; // default: none
  whiteList['shape-margin'] = false; // default: 0
  whiteList['size'] = false; // default: auto
  whiteList['speak'] = false; // default: auto
  whiteList['speak-as'] = false; // default: normal
  whiteList['speak-header'] = false; // default: once
  whiteList['speak-numeral'] = false; // default: continuous
  whiteList['speak-punctuation'] = false; // default: none
  whiteList['speech-rate'] = false; // default: medium
  whiteList['stress'] = false; // default: 50
  whiteList['string-set'] = false; // default: none
  whiteList['tab-size'] = false; // default: 8
  whiteList['table-layout'] = false; // default: auto
  whiteList['text-align'] = true; // default: start
  whiteList['text-align-last'] = true; // default: auto
  whiteList['text-combine-upright'] = true; // default: none
  whiteList['text-decoration'] = true; // default: none
  whiteList['text-decoration-color'] = true; // default: currentColor
  whiteList['text-decoration-line'] = true; // default: none
  whiteList['text-decoration-skip'] = true; // default: objects
  whiteList['text-decoration-style'] = true; // default: solid
  whiteList['text-emphasis'] = true; // default: depending on individual properties
  whiteList['text-emphasis-color'] = true; // default: currentColor
  whiteList['text-emphasis-position'] = true; // default: over right
  whiteList['text-emphasis-style'] = true; // default: none
  whiteList['text-height'] = true; // default: auto
  whiteList['text-indent'] = true; // default: 0
  whiteList['text-justify'] = true; // default: auto
  whiteList['text-orientation'] = true; // default: mixed
  whiteList['text-overflow'] = true; // default: clip
  whiteList['text-shadow'] = true; // default: none
  whiteList['text-space-collapse'] = true; // default: collapse
  whiteList['text-transform'] = true; // default: none
  whiteList['text-underline-position'] = true; // default: auto
  whiteList['text-wrap'] = true; // default: normal
  whiteList['top'] = false; // default: auto
  whiteList['transform'] = false; // default: none
  whiteList['transform-origin'] = false; // default: 50% 50% 0
  whiteList['transform-style'] = false; // default: flat
  whiteList['transition'] = false; // default: depending on individual properties
  whiteList['transition-delay'] = false; // default: 0s
  whiteList['transition-duration'] = false; // default: 0s
  whiteList['transition-property'] = false; // default: all
  whiteList['transition-timing-function'] = false; // default: ease
  whiteList['unicode-bidi'] = false; // default: normal
  whiteList['vertical-align'] = false; // default: baseline
  whiteList['visibility'] = false; // default: visible
  whiteList['voice-balance'] = false; // default: center
  whiteList['voice-duration'] = false; // default: auto
  whiteList['voice-family'] = false; // default: implementation dependent
  whiteList['voice-pitch'] = false; // default: medium
  whiteList['voice-range'] = false; // default: medium
  whiteList['voice-rate'] = false; // default: normal
  whiteList['voice-stress'] = false; // default: normal
  whiteList['voice-volume'] = false; // default: medium
  whiteList['volume'] = false; // default: medium
  whiteList['white-space'] = false; // default: normal
  whiteList['widows'] = false; // default: 2
  whiteList['width'] = true; // default: auto
  whiteList['will-change'] = false; // default: auto
  whiteList['word-break'] = true; // default: normal
  whiteList['word-spacing'] = true; // default: normal
  whiteList['word-wrap'] = true; // default: normal
  whiteList['wrap-flow'] = false; // default: auto
  whiteList['wrap-through'] = false; // default: wrap
  whiteList['writing-mode'] = false; // default: horizontal-tb
  whiteList['z-index'] = false; // default: auto

  return whiteList;
}


/**
 * 匹配到白名单上的一个属性时
 *
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @return {String}
 */
function onAttr (name, value, options) {
  // do nothing
}

/**
 * 匹配到不在白名单上的一个属性时
 *
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @return {String}
 */
function onIgnoreAttr (name, value, options) {
  // do nothing
}


exports.whiteList = getDefaultWhiteList();
exports.getDefaultWhiteList = getDefaultWhiteList;
exports.onAttr = onAttr;
exports.onIgnoreAttr = onIgnoreAttr;

},{}],8:[function(require,module,exports){
/**
 * cssfilter
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var DEFAULT = require('./default');
var FilterCSS = require('./css');


/**
 * XSS过滤
 *
 * @param {String} css 要过滤的CSS代码
 * @param {Object} options 选项：whiteList, onAttr, onIgnoreAttr
 * @return {String}
 */
function filterCSS (html, options) {
  var xss = new FilterCSS(options);
  return xss.process(html);
}


// 输出
exports = module.exports = filterCSS;
exports.FilterCSS = FilterCSS;
for (var i in DEFAULT) exports[i] = DEFAULT[i];

// 在浏览器端使用
if (typeof window !== 'undefined') {
  window.filterCSS = module.exports;
}

},{"./css":6,"./default":7}],9:[function(require,module,exports){
/**
 * cssfilter
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var _ = require('./util');


/**
 * 解析style
 *
 * @param {String} css
 * @param {Function} onAttr 处理属性的函数
 *   参数格式： function (sourcePosition, position, name, value, source)
 * @return {String}
 */
function parseStyle (css, onAttr) {
  css = _.trimRight(css);
  if (css[css.length - 1] !== ';') css += ';';
  var cssLength = css.length;
  var isParenthesisOpen = false;
  var lastPos = 0;
  var i = 0;
  var retCSS = '';

  function addNewAttr () {
    // 如果没有正常的闭合圆括号，则直接忽略当前属性
    if (!isParenthesisOpen) {
      var source = _.trim(css.slice(lastPos, i));
      var j = source.indexOf(':');
      if (j !== -1) {
        var name = _.trim(source.slice(0, j));
        var value = _.trim(source.slice(j + 1));
        // 必须有属性名称
        if (name) {
          var ret = onAttr(lastPos, retCSS.length, name, value, source);
          if (ret) retCSS += ret + '; ';
        }
      }
    }
    lastPos = i + 1;
  }

  for (; i < cssLength; i++) {
    var c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      // 备注开始
      var j = css.indexOf('*/', i + 2);
      // 如果没有正常的备注结束，则后面的部分全部跳过
      if (j === -1) break;
      // 直接将当前位置调到备注结尾，并且初始化状态
      i = j + 1;
      lastPos = i + 1;
      isParenthesisOpen = false;
    } else if (c === '(') {
      isParenthesisOpen = true;
    } else if (c === ')') {
      isParenthesisOpen = false;
    } else if (c === ';') {
      if (isParenthesisOpen) {
        // 在圆括号里面，忽略
      } else {
        addNewAttr();
      }
    } else if (c === '\n') {
      addNewAttr();
    }
  }

  return _.trim(retCSS);
}

module.exports = parseStyle;

},{"./util":10}],10:[function(require,module,exports){
module.exports = {
  indexOf: function (arr, item) {
    var i, j;
    if (Array.prototype.indexOf) {
      return arr.indexOf(item);
    }
    for (i = 0, j = arr.length; i < j; i++) {
      if (arr[i] === item) {
        return i;
      }
    }
    return -1;
  },
  forEach: function (arr, fn, scope) {
    var i, j;
    if (Array.prototype.forEach) {
      return arr.forEach(fn, scope);
    }
    for (i = 0, j = arr.length; i < j; i++) {
      fn.call(scope, arr[i], i, arr);
    }
  },
  trim: function (str) {
    if (String.prototype.trim) {
      return str.trim();
    }
    return str.replace(/(^\s*)|(\s*$)/g, '');
  },
  trimRight: function (str) {
    if (String.prototype.trimRight) {
      return str.trimRight();
    }
    return str.replace(/(\s*$)/g, '');
  }
};

},{}]},{},[2]);
/*
  global initializeLocalStorageRender, initializeBodyData,
  initializeAllTagEditButtons, initializeUserFollowButts,
  initializeBaseTracking, initializeCommentsPage,
  initializeArticleDate, initializeArticleReactions, initNotifications,
  initializeCommentDate, initializeSettings,
  initializeCommentPreview, initializeRuntimeBanner,
  initializeTimeFixer, initializeDashboardSort,
  initializeArchivedPostFilter, initializeCreditsPage,
  initializeProfileInfoToggle, initializePodcastPlayback,
  initializeVideoPlayback, initializeDrawerSliders, initializeProfileBadgesToggle,
  initializeHeroBannerClose, initializeOnboardingTaskCard, initScrolling,
  nextPage:writable, fetching:writable, done:writable, adClicked:writable,
  initializePaymentPointers, initializeBroadcast, initializeDateHelpers,
  initializeColorPicker, Runtime
*/

function callInitializers() {
  initializeBaseTracking();
  initializePaymentPointers();
  initializeCommentsPage();
  initializeArticleDate();
  initializeArticleReactions();
  initNotifications();
  initializeCommentDate();
  initializeSettings();
  initializeCommentPreview();
  initializeTimeFixer();
  initializeDashboardSort();
  initializeArchivedPostFilter();
  initializeCreditsPage();
  initializeProfileInfoToggle();
  initializeProfileBadgesToggle();
  initializeDrawerSliders();
  initializeHeroBannerClose();
  initializeOnboardingTaskCard();
  initializeDateHelpers();
  initializeColorPicker();
}

function initializePage() {
  initializeLocalStorageRender();
  initializeBodyData();

  var waitingForDataLoad = setInterval(function wait() {
    if (document.body.getAttribute('data-loaded') === 'true') {
      clearInterval(waitingForDataLoad);
      if (document.body.getAttribute('data-user-status') === 'logged-in') {
        initializeBaseUserData();
        initializeAllTagEditButtons();
      }
      initializeBroadcast();
      initializeReadingListIcons();
      initializeSponsorshipVisibility();
      if (document.getElementById('sidebar-additional')) {
        document.getElementById('sidebar-additional').classList.add('showing');
      }
      initializePodcastPlayback();
      initializeVideoPlayback();
    }
  }, 1);

  callInitializers();

  function freezeScrolling(event) {
    event.preventDefault();
  }

  nextPage = 0;
  fetching = false;
  done = false;
  adClicked = false;
  setTimeout(function undone() {
    done = false;
  }, 300);
  if (!initScrolling.called) {
    initScrolling();
  }

  // Initialize data-runtime context to the body data-attribute
  document.body.dataset.runtime = Runtime.currentContext();
};
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Honeybadger = factory());
}(this, (function () { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    var UNKNOWN_FUNCTION = '<unknown>';
    /**
     * This parses the different stack traces and puts them into one format
     * This borrows heavily from TraceKit (https://github.com/csnover/TraceKit)
     */

    function parse(stackString) {
      var lines = stackString.split('\n');
      return lines.reduce(function (stack, line) {
        var parseResult = parseChrome(line) || parseWinjs(line) || parseGecko(line) || parseNode(line) || parseJSC(line);

        if (parseResult) {
          stack.push(parseResult);
        }

        return stack;
      }, []);
    }
    var chromeRe = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
    var chromeEvalRe = /\((\S*)(?::(\d+))(?::(\d+))\)/;

    function parseChrome(line) {
      var parts = chromeRe.exec(line);

      if (!parts) {
        return null;
      }

      var isNative = parts[2] && parts[2].indexOf('native') === 0; // start of line

      var isEval = parts[2] && parts[2].indexOf('eval') === 0; // start of line

      var submatch = chromeEvalRe.exec(parts[2]);

      if (isEval && submatch != null) {
        // throw out eval line/column and use top-most line/column number
        parts[2] = submatch[1]; // url

        parts[3] = submatch[2]; // line

        parts[4] = submatch[3]; // column
      }

      return {
        file: !isNative ? parts[2] : null,
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: isNative ? [parts[2]] : [],
        lineNumber: parts[3] ? +parts[3] : null,
        column: parts[4] ? +parts[4] : null
      };
    }

    var winjsRe = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;

    function parseWinjs(line) {
      var parts = winjsRe.exec(line);

      if (!parts) {
        return null;
      }

      return {
        file: parts[2],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[3],
        column: parts[4] ? +parts[4] : null
      };
    }

    var geckoRe = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i;
    var geckoEvalRe = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;

    function parseGecko(line) {
      var parts = geckoRe.exec(line);

      if (!parts) {
        return null;
      }

      var isEval = parts[3] && parts[3].indexOf(' > eval') > -1;
      var submatch = geckoEvalRe.exec(parts[3]);

      if (isEval && submatch != null) {
        // throw out eval line/column and use top-most line number
        parts[3] = submatch[1];
        parts[4] = submatch[2];
        parts[5] = null; // no column when eval
      }

      return {
        file: parts[3],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: parts[2] ? parts[2].split(',') : [],
        lineNumber: parts[4] ? +parts[4] : null,
        column: parts[5] ? +parts[5] : null
      };
    }

    var javaScriptCoreRe = /^\s*(?:([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;

    function parseJSC(line) {
      var parts = javaScriptCoreRe.exec(line);

      if (!parts) {
        return null;
      }

      return {
        file: parts[3],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[4],
        column: parts[5] ? +parts[5] : null
      };
    }

    var nodeRe = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;

    function parseNode(line) {
      var parts = nodeRe.exec(line);

      if (!parts) {
        return null;
      }

      return {
        file: parts[2],
        methodName: parts[1] || UNKNOWN_FUNCTION,
        arguments: [],
        lineNumber: +parts[3],
        column: parts[4] ? +parts[4] : null
      };
    }

    function merge(obj1, obj2) {
        var result = {};
        for (var k in obj1) {
            result[k] = obj1[k];
        }
        for (var k in obj2) {
            result[k] = obj2[k];
        }
        return result;
    }
    function mergeNotice(notice1, notice2) {
        var result = merge(notice1, notice2);
        if (notice1.context && notice2.context) {
            result.context = merge(notice1.context, notice2.context);
        }
        return result;
    }
    function objectIsEmpty(obj) {
        for (var k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                return false;
            }
        }
        return true;
    }
    function objectIsExtensible(obj) {
        if (typeof Object.isExtensible !== 'function') {
            return true;
        }
        return Object.isExtensible(obj);
    }
    function makeBacktrace(stack, shift) {
        if (shift === void 0) { shift = 0; }
        try {
            var backtrace = parse(stack).map(function (line) {
                return {
                    file: line.file,
                    method: line.methodName,
                    number: line.lineNumber,
                    column: line.column
                };
            });
            backtrace.splice(0, shift);
            return backtrace;
        }
        catch (_err) {
            // TODO: log error
            return [];
        }
    }
    function runBeforeNotifyHandlers(notice, handlers) {
        for (var i = 0, len = handlers.length; i < len; i++) {
            var handler = handlers[i];
            if (handler(notice) === false) {
                return false;
            }
        }
        return true;
    }
    function runAfterNotifyHandlers(notice, handlers, error) {
        if (error === void 0) { error = undefined; }
        for (var i = 0, len = handlers.length; i < len; i++) {
            handlers[i](error, notice);
        }
        return true;
    }
    // Returns a new object with properties from other object.
    function newObject(obj) {
        if (typeof (obj) !== 'object' || obj === null) {
            return {};
        }
        var result = {};
        for (var k in obj) {
            result[k] = obj[k];
        }
        return result;
    }
    function sanitize(obj, maxDepth) {
        if (maxDepth === void 0) { maxDepth = 8; }
        var seenObjects = [];
        function seen(obj) {
            if (!obj || typeof (obj) !== 'object') {
                return false;
            }
            for (var i = 0; i < seenObjects.length; i++) {
                var value = seenObjects[i];
                if (value === obj) {
                    return true;
                }
            }
            seenObjects.push(obj);
            return false;
        }
        function canSerialize(obj) {
            // Functions are TMI and Symbols can't convert to strings.
            if (/function|symbol/.test(typeof (obj))) {
                return false;
            }
            if (obj === null) {
                return false;
            }
            // No prototype, likely created with `Object.create(null)`.
            if (typeof obj === 'object' && typeof obj.hasOwnProperty === 'undefined') {
                return false;
            }
            return true;
        }
        function serialize(obj, depth) {
            if (depth === void 0) { depth = 0; }
            if (depth >= maxDepth) {
                return '[DEPTH]';
            }
            // Inspect invalid types
            if (!canSerialize(obj)) {
                return Object.prototype.toString.call(obj);
            }
            // Halt circular references
            if (seen(obj)) {
                return '[RECURSION]';
            }
            // Serialize inside arrays
            if (Array.isArray(obj)) {
                return obj.map(function (o) { return serialize(o, depth + 1); });
            }
            // Serialize inside objects
            if (typeof (obj) === 'object') {
                var ret = {};
                for (var k in obj) {
                    var v = obj[k];
                    if (Object.prototype.hasOwnProperty.call(obj, k) && (k != null) && (v != null)) {
                        ret[k] = serialize(v, depth + 1);
                    }
                }
                return ret;
            }
            // Return everything else untouched
            return obj;
        }
        return serialize(obj);
    }
    function logger(client) {
        var log = function (method) {
            return function () {
                var _a;
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (method === 'debug' && !client.config.debug) {
                    return;
                }
                args.unshift('[Honeybadger]');
                (_a = client.config.logger)[method].apply(_a, args);
            };
        };
        return {
            log: log('log'),
            info: log('info'),
            debug: log('debug'),
            warn: log('warn'),
            error: log('error')
        };
    }
    /**
     * Converts any object into a notice object (which at minimum has the same
     * properties as Error, but supports additional Honeybadger properties.)
     */
    function makeNotice(thing) {
        var notice;
        if (!thing) {
            notice = {};
        }
        else if (Object.prototype.toString.call(thing) === '[object Error]') {
            var e = thing;
            notice = merge(thing, { name: e.name, message: e.message, stack: e.stack });
        }
        else if (typeof thing === 'object') {
            notice = newObject(thing);
        }
        else {
            var m = String(thing);
            notice = { message: m };
        }
        return notice;
    }
    /**
     * Instrument an existing function inside an object (usually global).
     * @param {!Object} object
     * @param {!String} name
     * @param {!Function} replacement
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function instrument(object, name, replacement) {
        if (!object || !name || !replacement || !(name in object)) {
            return;
        }
        var original = object[name];
        while (original && original.__hb_original) {
            original = original.__hb_original;
        }
        try {
            object[name] = replacement(original);
            object[name].__hb_original = original;
        }
        catch (_e) {
            // Ignores errors like this one:
            //   Error: TypeError: Cannot set property onunhandledrejection of [object Object] which has only a getter
            //   User-Agent: Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.1 Chrome/79.0.3945.136 Mobile Safari/537.36
        }
    }
    function endpoint(config, path) {
        var endpoint = config.endpoint.trim().replace(/\/$/, '');
        path = path.trim().replace(/(^\/|\/$)/g, '');
        return endpoint + "/" + path;
    }
    function generateStackTrace() {
        try {
            throw new Error('');
        }
        catch (e) {
            if (e.stack) {
                return e.stack;
            }
        }
        var maxStackSize = 10;
        var stack = [];
        var curr = arguments.callee;
        while (curr && stack.length < maxStackSize) {
            if (/function(?:\s+([\w$]+))+\s*\(/.test(curr.toString())) {
                stack.push(RegExp.$1 || '<anonymous>');
            }
            else {
                stack.push('<anonymous>');
            }
            try {
                curr = curr.caller;
            }
            catch (e) {
                break;
            }
        }
        return stack.join('\n');
    }
    function filter(obj, filters) {
        if (!is('Object', obj)) {
            return;
        }
        if (!is('Array', filters)) {
            filters = [];
        }
        var seen = [];
        function filter(obj) {
            var k, newObj;
            if (is('Object', obj) || is('Array', obj)) {
                if (seen.indexOf(obj) !== -1) {
                    return '[CIRCULAR DATA STRUCTURE]';
                }
                seen.push(obj);
            }
            if (is('Object', obj)) {
                newObj = {};
                for (k in obj) {
                    if (filterMatch(k, filters)) {
                        newObj[k] = '[FILTERED]';
                    }
                    else {
                        newObj[k] = filter(obj[k]);
                    }
                }
                return newObj;
            }
            if (is('Array', obj)) {
                return obj.map(function (v) { return filter(v); });
            }
            if (is('Function', obj)) {
                return '[FUNC]';
            }
            return obj;
        }
        return filter(obj);
    }
    function filterMatch(key, filters) {
        for (var i = 0; i < filters.length; i++) {
            if (key.toLowerCase().indexOf(filters[i].toLowerCase()) !== -1) {
                return true;
            }
        }
        return false;
    }
    function is(type, obj) {
        var klass = Object.prototype.toString.call(obj).slice(8, -1);
        return obj !== undefined && obj !== null && klass === type;
    }
    function filterUrl(url, filters) {
        if (!filters) {
            return url;
        }
        if (typeof url !== 'string') {
            return url;
        }
        var query = url.split(/\?/, 2)[1];
        if (!query) {
            return url;
        }
        var result = url;
        query.split(/[&]\s?/).forEach(function (pair) {
            var _a = pair.split('=', 2), key = _a[0], value = _a[1];
            if (filterMatch(key, filters)) {
                result = result.replace(key + "=" + value, key + "=[FILTERED]");
            }
        });
        return result;
    }
    function formatCGIData(vars, prefix) {
        if (prefix === void 0) { prefix = ''; }
        var formattedVars = {};
        Object.keys(vars).forEach(function (key) {
            var formattedKey = prefix + key.replace(/\W/g, '_').toUpperCase();
            formattedVars[formattedKey] = vars[key];
        });
        return formattedVars;
    }

    var notifier = {
        name: 'honeybadger-js',
        url: 'https://github.com/honeybadger-io/honeybadger-js',
        version: '3.2.7'
    };
    // Split at commas
    var TAG_SEPARATOR = /,/;
    // Removes any non-word characters
    var TAG_SANITIZER = /[^\w]/g;
    // Checks for blank strings
    var STRING_EMPTY = '';
    // Checks for non-blank characters
    var NOT_BLANK = /\S/;
    var Client = /** @class */ (function () {
        function Client(opts) {
            if (opts === void 0) { opts = {}; }
            /** @internal */
            this.__pluginsExecuted = false;
            /** @internal */
            this.__context = {};
            /** @internal */
            this.__breadcrumbs = [];
            /** @internal */
            this.__beforeNotifyHandlers = [];
            /** @internal */
            this.__afterNotifyHandlers = [];
            this.config = __assign({ apiKey: null, endpoint: 'https://api.honeybadger.io', environment: null, hostname: null, projectRoot: null, component: null, action: null, revision: null, reportData: null, breadcrumbsEnabled: true, maxBreadcrumbs: 40, maxObjectDepth: 8, logger: console, developmentEnvironments: ['dev', 'development', 'test'], disabled: false, debug: false, tags: null, enableUncaught: true, enableUnhandledRejection: true, afterUncaught: function () { return true; }, filters: ['creditcard', 'password'], __plugins: [] }, opts);
            this.logger = logger(this);
        }
        Client.prototype.factory = function (_opts) {
            throw (new Error('Must implement __factory in subclass'));
        };
        Client.prototype.getVersion = function () {
            return notifier.version;
        };
        Client.prototype.configure = function (opts) {
            var _this = this;
            if (opts === void 0) { opts = {}; }
            for (var k in opts) {
                this.config[k] = opts[k];
            }
            if (!this.__pluginsExecuted) {
                this.__pluginsExecuted = true;
                this.config.__plugins.forEach(function (plugin) { return plugin.load(_this); });
            }
            return this;
        };
        Client.prototype.beforeNotify = function (handler) {
            this.__beforeNotifyHandlers.push(handler);
            return this;
        };
        Client.prototype.afterNotify = function (handler) {
            this.__afterNotifyHandlers.push(handler);
            return this;
        };
        Client.prototype.setContext = function (context) {
            if (typeof context === 'object') {
                this.__context = merge(this.__context, context);
            }
            return this;
        };
        Client.prototype.resetContext = function (context) {
            this.logger.warn('Deprecation warning: `Honeybadger.resetContext()` has been deprecated; please use `Honeybadger.clear()` instead.');
            if (typeof context === 'object' && context !== null) {
                this.__context = merge({}, context);
            }
            else {
                this.__context = {};
            }
            return this;
        };
        Client.prototype.clear = function () {
            this.__context = {};
            this.__breadcrumbs = [];
            return this;
        };
        Client.prototype.notify = function (notice, name, extra) {
            if (name === void 0) { name = undefined; }
            if (extra === void 0) { extra = undefined; }
            if (this.config.disabled) {
                this.logger.warn('Deprecation warning: instead of `disabled: true`, use `reportData: false` to explicitly disable Honeybadger reporting. (Dropping notice: honeybadger.js is disabled)');
                return false;
            }
            if (!this.__reportData()) {
                this.logger.debug('Dropping notice: honeybadger.js is in development mode');
                return false;
            }
            if (!this.config.apiKey) {
                this.logger.warn('Unable to send error report: no API key has been configured');
                return false;
            }
            notice = makeNotice(notice);
            if (name && !(typeof name === 'object')) {
                var n = String(name);
                name = { name: n };
            }
            if (name) {
                notice = mergeNotice(notice, name);
            }
            if (typeof extra === 'object' && extra !== null) {
                notice = mergeNotice(notice, extra);
            }
            if (objectIsEmpty(notice)) {
                return false;
            }
            var noticeTags = this.__constructTags(notice.tags);
            var contextTags = this.__constructTags(this.__context["tags"]);
            var configTags = this.__constructTags(this.config.tags);
            // Turning into a Set will remove duplicates
            var tags = noticeTags.concat(contextTags).concat(configTags);
            var uniqueTags = tags.filter(function (item, index) { return tags.indexOf(item) === index; });
            notice = merge(notice, {
                name: notice.name || 'Error',
                context: merge(this.__context, notice.context),
                projectRoot: notice.projectRoot || this.config.projectRoot,
                environment: notice.environment || this.config.environment,
                component: notice.component || this.config.component,
                action: notice.action || this.config.action,
                revision: notice.revision || this.config.revision,
                tags: uniqueTags
            });
            var backtraceShift = 0;
            if (typeof notice.stack !== 'string' || !notice.stack.trim()) {
                notice.stack = generateStackTrace();
                backtraceShift = 2;
            }
            notice.backtrace = makeBacktrace(notice.stack, backtraceShift);
            if (!runBeforeNotifyHandlers(notice, this.__beforeNotifyHandlers)) {
                return false;
            }
            this.addBreadcrumb('Honeybadger Notice', {
                category: 'notice',
                metadata: {
                    message: notice.message,
                    name: notice.name,
                    stack: notice.stack
                }
            });
            notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__breadcrumbs.slice() : [];
            return this.__send(notice);
        };
        Client.prototype.addBreadcrumb = function (message, opts) {
            if (!this.config.breadcrumbsEnabled) {
                return;
            }
            opts = opts || {};
            var metadata = newObject(opts.metadata);
            var category = opts.category || 'custom';
            var timestamp = new Date().toISOString();
            this.__breadcrumbs.push({
                category: category,
                message: message,
                metadata: metadata,
                timestamp: timestamp
            });
            var limit = this.config.maxBreadcrumbs;
            if (this.__breadcrumbs.length > limit) {
                this.__breadcrumbs = this.__breadcrumbs.slice(this.__breadcrumbs.length - limit);
            }
            return this;
        };
        /** @internal */
        Client.prototype.__reportData = function () {
            if (this.config.reportData !== null) {
                return this.config.reportData;
            }
            return !(this.config.environment && this.config.developmentEnvironments.includes(this.config.environment));
        };
        /** @internal */
        Client.prototype.__send = function (_notice) {
            throw (new Error('Must implement send in subclass'));
        };
        /** @internal */
        Client.prototype.__buildPayload = function (notice) {
            var headers = filter(notice.headers, this.config.filters) || {};
            var cgiData = filter(__assign(__assign({}, notice.cgiData), formatCGIData(headers, 'HTTP_')), this.config.filters);
            return {
                notifier: notifier,
                breadcrumbs: {
                    enabled: !!this.config.breadcrumbsEnabled,
                    trail: notice.__breadcrumbs || []
                },
                error: {
                    class: notice.name,
                    message: notice.message,
                    backtrace: notice.backtrace,
                    fingerprint: notice.fingerprint,
                    tags: notice.tags
                },
                request: {
                    url: filterUrl(notice.url, this.config.filters),
                    component: notice.component,
                    action: notice.action,
                    context: notice.context,
                    cgi_data: cgiData,
                    params: filter(notice.params, this.config.filters) || {},
                    session: filter(notice.session, this.config.filters) || {}
                },
                server: {
                    project_root: notice.projectRoot,
                    environment_name: notice.environment,
                    revision: notice.revision,
                    hostname: this.config.hostname,
                    time: new Date().toUTCString()
                },
                details: notice.details || {}
            };
        };
        /** @internal */
        Client.prototype.__constructTags = function (tags) {
            if (!tags) {
                return [];
            }
            return tags.toString().split(TAG_SEPARATOR).map(function (tag) {
                return tag.replace(TAG_SANITIZER, STRING_EMPTY);
            }).filter(function (tag) { return NOT_BLANK.test(tag); });
        };
        return Client;
    }());

    /**
     * Converts an HTMLElement into a human-readable string.
     * @param {!HTMLElement} element
     * @return {string}
     */
    function stringNameOfElement(element) {
        if (!element || !element.tagName) {
            return '';
        }
        var name = element.tagName.toLowerCase();
        // Ignore the root <html> element in selectors and events.
        if (name === 'html') {
            return '';
        }
        if (element.id) {
            name += "#" + element.id;
        }
        var stringClassNames = element.getAttribute('class');
        if (stringClassNames) {
            stringClassNames.split(/\s+/).forEach(function (className) {
                name += "." + className;
            });
        }
        ['alt', 'name', 'title', 'type'].forEach(function (attrName) {
            var attr = element.getAttribute(attrName);
            if (attr) {
                name += "[" + attrName + "=\"" + attr + "\"]";
            }
        });
        var siblings = getSiblings(element);
        if (siblings.length > 1) {
            name += ":nth-child(" + (Array.prototype.indexOf.call(siblings, element) + 1) + ")";
        }
        return name;
    }
    function stringSelectorOfElement(element) {
        var name = stringNameOfElement(element);
        if (element.parentNode && element.parentNode.tagName) {
            var parentName = stringSelectorOfElement(element.parentNode);
            if (parentName.length > 0) {
                return parentName + " > " + name;
            }
        }
        return name;
    }
    function stringTextOfElement(element) {
        var text = element.textContent || element.innerText || '';
        if (!text && (element.type === 'submit' || element.type === 'button')) {
            text = element.value;
        }
        return truncate(text.trim(), 300);
    }
    function nativeFetch() {
        if (!window.fetch) {
            return false;
        }
        if (isNative(window.fetch)) {
            return true;
        }
        // If fetch isn't native, it may be wrapped by someone else. Try to get
        // a pristine function from an iframe.
        try {
            var sandbox = document.createElement('iframe');
            sandbox.style.display = 'none';
            document.head.appendChild(sandbox);
            var result = sandbox.contentWindow.fetch && isNative(sandbox.contentWindow.fetch);
            document.head.removeChild(sandbox);
            return result;
        }
        catch (err) {
            if (console && console.warn) {
                console.warn('failed to detect native fetch via iframe: ' + err);
            }
        }
        return false;
    }
    function isNative(func) {
        return func.toString().indexOf('native') !== -1;
    }
    function parseURL(url) {
        // Regexp: https://tools.ietf.org/html/rfc3986#appendix-B
        var match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/) || {};
        return {
            protocol: match[2],
            host: match[4],
            pathname: match[5]
        };
    }
    function localURLPathname(url) {
        var parsed = parseURL(url);
        var parsedDocURL = parseURL(document.URL);
        // URL must be relative
        if (!parsed.host || !parsed.protocol) {
            return parsed.pathname;
        }
        // Same domain
        if (parsed.protocol === parsedDocURL.protocol && parsed.host === parsedDocURL.host) {
            return parsed.pathname;
        }
        // x-domain
        return parsed.protocol + "://" + parsed.host + parsed.pathname;
    }
    function decodeCookie(string) {
        var result = {};
        string.split(/[;,]\s?/).forEach(function (pair) {
            var _a = pair.split('=', 2), key = _a[0], value = _a[1];
            result[key] = value;
        });
        return result;
    }
    function encodeCookie(object) {
        if (typeof object !== 'object') {
            return undefined;
        }
        var cookies = [];
        for (var k in object) {
            cookies.push(k + '=' + object[k]);
        }
        return cookies.join(';');
    }
    // Helpers
    function getSiblings(element) {
        try {
            var nodes = element.parentNode.childNodes;
            var siblings_1 = [];
            Array.prototype.forEach.call(nodes, function (node) {
                if (node.tagName && node.tagName === element.tagName) {
                    siblings_1.push(node);
                }
            });
            return siblings_1;
        }
        catch (e) {
            return [];
        }
    }
    function truncate(string, length) {
        if (string.length > length) {
            string = string.substr(0, length) + '...';
        }
        return string;
    }
    // Used to decide which error handling method to use when wrapping async
    // handlers: try/catch, or `window.onerror`. When available, `window.onerror`
    // will provide more information in modern browsers.
    var preferCatch = (function () {
        var preferCatch = true;
        // IE < 10
        if (!window.atob) {
            preferCatch = false;
        }
        // Modern browsers support the full ErrorEvent API
        // See https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
        if (window.ErrorEvent) {
            try {
                if ((new window.ErrorEvent('')).colno === 0) {
                    preferCatch = false;
                }
                // eslint-disable-next-line no-empty
            }
            catch (_e) { }
        }
        return preferCatch;
    })();

    /* eslint-disable prefer-rest-params */
    var ignoreOnError = 0;
    var currentTimeout;
    function ignoreNextOnError() {
        ignoreOnError += 1;
        clearTimeout(currentTimeout);
        currentTimeout = setTimeout(function () {
            ignoreOnError = 0;
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onError(_window) {
        if (_window === void 0) { _window = window; }
        return {
            load: function (client) {
                instrument(_window, 'onerror', function (original) {
                    var onerror = function (msg, url, line, col, err) {
                        client.logger.debug('window.onerror callback invoked', arguments);
                        if (ignoreOnError > 0) {
                            client.logger.debug('Ignoring window.onerror (error likely reported earlier)', arguments);
                            ignoreOnError -= 1;
                            return;
                        }
                        if (!client.config.enableUncaught) {
                            return;
                        }
                        if (line === 0 && /Script error\.?/.test(msg)) {
                            // See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes
                            client.logger.info('Ignoring cross-domain script error: enable CORS to track these types of errors', arguments);
                            return;
                        }
                        var notice = makeNotice(err);
                        if (!notice.name) {
                            notice.name = 'window.onerror';
                        }
                        if (!notice.message) {
                            notice.message = msg;
                        }
                        if (!notice.stack) {
                            // Simulate v8 stack
                            notice.stack = [notice.message, '\n    at ? (', url || 'unknown', ':', line || 0, ':', col || 0, ')'].join('');
                        }
                        client.addBreadcrumb((notice.name === 'window.onerror' || !notice.name) ? 'window.onerror' : "window.onerror: " + notice.name, {
                            category: 'error',
                            metadata: {
                                name: notice.name,
                                message: notice.message,
                                stack: notice.stack
                            }
                        });
                        client.notify(notice);
                    };
                    return function (msg, url, line, col, err) {
                        onerror(msg, url, line, col, err);
                        if (typeof original === 'function') {
                            return original.apply(window, arguments);
                        }
                        return false;
                    };
                });
            }
        };
    }

    /* eslint-disable prefer-rest-params */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onUnhandledRejection (_window) {
        if (_window === void 0) { _window = window; }
        return {
            load: function (client) {
                if (!client.config.enableUnhandledRejection) {
                    return;
                }
                instrument(_window, 'onunhandledrejection', function (original) {
                    // See https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
                    function onunhandledrejection(promiseRejectionEvent) {
                        var _a;
                        client.logger.debug('window.onunhandledrejection callback invoked', arguments);
                        if (!client.config.enableUnhandledRejection) {
                            return;
                        }
                        var reason = promiseRejectionEvent.reason;
                        if (reason instanceof Error) {
                            // simulate v8 stack
                            // const fileName = reason.fileName || 'unknown'
                            // const lineNumber = reason.lineNumber || 0
                            var fileName = 'unknown';
                            var lineNumber = 0;
                            var stackFallback = reason.message + "\n    at ? (" + fileName + ":" + lineNumber + ")";
                            var stack = reason.stack || stackFallback;
                            var err = {
                                name: reason.name,
                                message: "UnhandledPromiseRejectionWarning: " + reason,
                                stack: stack
                            };
                            client.addBreadcrumb("window.onunhandledrejection: " + err.name, {
                                category: 'error',
                                metadata: err
                            });
                            client.notify(err);
                            return;
                        }
                        var message = typeof reason === 'string' ? reason : ((_a = JSON.stringify(reason)) !== null && _a !== void 0 ? _a : 'Unspecified reason');
                        client.notify({
                            name: 'window.onunhandledrejection',
                            message: "UnhandledPromiseRejectionWarning: " + message
                        });
                    }
                    return function (promiseRejectionEvent) {
                        onunhandledrejection(promiseRejectionEvent);
                        if (typeof original === 'function') {
                            original.apply(this, arguments);
                        }
                    };
                });
            }
        };
    }

    /* eslint-disable prefer-rest-params */
    function breadcrumbs (_window) {
        if (_window === void 0) { _window = window; }
        return {
            load: function (client) {
                function breadcrumbsEnabled(type) {
                    if (client.config.breadcrumbsEnabled === true) {
                        return true;
                    }
                    if (type) {
                        return client.config.breadcrumbsEnabled[type] === true;
                    }
                    return client.config.breadcrumbsEnabled !== false;
                }
                // Breadcrumbs: instrument console
                (function () {
                    if (!breadcrumbsEnabled('console')) {
                        return;
                    }
                    function inspectArray(obj) {
                        if (!Array.isArray(obj)) {
                            return '';
                        }
                        return obj.map(function (value) {
                            try {
                                return String(value);
                            }
                            catch (e) {
                                return '[unknown]';
                            }
                        }).join(' ');
                    }
                    ['debug', 'info', 'warn', 'error', 'log'].forEach(function (level) {
                        instrument(_window.console, level, function (original) {
                            return function () {
                                var args = Array.prototype.slice.call(arguments);
                                var message = inspectArray(args);
                                var opts = {
                                    category: 'log',
                                    metadata: {
                                        level: level,
                                        arguments: sanitize(args, 3)
                                    }
                                };
                                client.addBreadcrumb(message, opts);
                                if (typeof original === 'function') {
                                    Function.prototype.apply.call(original, _window.console, arguments);
                                }
                            };
                        });
                    });
                })();
                // Breadcrumbs: instrument click events
                (function () {
                    if (!breadcrumbsEnabled('dom')) {
                        return;
                    }
                    _window.addEventListener('click', function (event) {
                        var message, selector, text;
                        try {
                            message = stringNameOfElement(event.target);
                            selector = stringSelectorOfElement(event.target);
                            text = stringTextOfElement(event.target);
                        }
                        catch (e) {
                            message = 'UI Click';
                            selector = '[unknown]';
                            text = '[unknown]';
                        }
                        // There's nothing to display
                        if (message.length === 0) {
                            return;
                        }
                        client.addBreadcrumb(message, {
                            category: 'ui.click',
                            metadata: {
                                selector: selector,
                                text: text,
                                event: event
                            }
                        });
                    }, true);
                })();
                // Breadcrumbs: instrument XMLHttpRequest
                (function () {
                    if (!breadcrumbsEnabled('network')) {
                        return;
                    }
                    // -- On xhr.open: capture initial metadata
                    instrument(XMLHttpRequest.prototype, 'open', function (original) {
                        return function () {
                            // eslint-disable-next-line @typescript-eslint/no-this-alias
                            var xhr = this;
                            var url = arguments[1];
                            var method = typeof arguments[0] === 'string' ? arguments[0].toUpperCase() : arguments[0];
                            var message = method + " " + localURLPathname(url);
                            this.__hb_xhr = {
                                type: 'xhr',
                                method: method,
                                url: url,
                                message: message
                            };
                            if (typeof original === 'function') {
                                original.apply(xhr, arguments);
                            }
                        };
                    });
                    // -- On xhr.send: set up xhr.onreadystatechange to report breadcrumb
                    instrument(XMLHttpRequest.prototype, 'send', function (original) {
                        return function () {
                            // eslint-disable-next-line @typescript-eslint/no-this-alias
                            var xhr = this;
                            function onreadystatechangeHandler() {
                                if (xhr.readyState === 4) {
                                    var message = void 0;
                                    if (xhr.__hb_xhr) {
                                        xhr.__hb_xhr.status_code = xhr.status;
                                        message = xhr.__hb_xhr.message;
                                        delete xhr.__hb_xhr.message;
                                    }
                                    client.addBreadcrumb(message || 'XMLHttpRequest', {
                                        category: 'request',
                                        metadata: xhr.__hb_xhr
                                    });
                                }
                            }
                            if ('onreadystatechange' in xhr && typeof xhr.onreadystatechange === 'function') {
                                instrument(xhr, 'onreadystatechange', function (original) {
                                    return function () {
                                        onreadystatechangeHandler();
                                        if (typeof original === 'function') {
                                            // eslint-disable-next-line prefer-rest-params
                                            original.apply(this, arguments);
                                        }
                                    };
                                });
                            }
                            else {
                                xhr.onreadystatechange = onreadystatechangeHandler;
                            }
                            if (typeof original === 'function') {
                                // eslint-disable-next-line prefer-rest-params
                                original.apply(xhr, arguments);
                            }
                        };
                    });
                })();
                // Breadcrumbs: instrument fetch
                (function () {
                    if (!breadcrumbsEnabled('network')) {
                        return;
                    }
                    if (!nativeFetch()) {
                        // Polyfills use XHR.
                        return;
                    }
                    instrument(_window, 'fetch', function (original) {
                        return function () {
                            // eslint-disable-next-line prefer-rest-params
                            var input = arguments[0];
                            var method = 'GET';
                            var url;
                            if (typeof input === 'string') {
                                url = input;
                            }
                            else if ('Request' in _window && input instanceof Request) {
                                url = input.url;
                                if (input.method) {
                                    method = input.method;
                                }
                            }
                            else {
                                url = String(input);
                            }
                            if (arguments[1] && arguments[1].method) {
                                method = arguments[1].method;
                            }
                            if (typeof method === 'string') {
                                method = method.toUpperCase();
                            }
                            var message = method + " " + localURLPathname(url);
                            var metadata = {
                                type: 'fetch',
                                method: method,
                                url: url
                            };
                            return original
                                .apply(this, arguments)
                                .then(function (response) {
                                metadata['status_code'] = response.status;
                                client.addBreadcrumb(message, {
                                    category: 'request',
                                    metadata: metadata
                                });
                                return response;
                            })
                                .catch(function (error) {
                                client.addBreadcrumb('fetch error', {
                                    category: 'error',
                                    metadata: metadata
                                });
                                throw error;
                            });
                        };
                    });
                })();
                // Breadcrumbs: instrument navigation
                (function () {
                    if (!breadcrumbsEnabled('navigation')) {
                        return;
                    }
                    // The last known href of the current page
                    var lastHref = _window.location.href;
                    function recordUrlChange(from, to) {
                        lastHref = to;
                        client.addBreadcrumb('Page changed', {
                            category: 'navigation',
                            metadata: {
                                from: from,
                                to: to
                            }
                        });
                    }
                    // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
                    instrument(_window, 'onpopstate', function (original) {
                        return function () {
                            recordUrlChange(lastHref, _window.location.href);
                            if (original) {
                                return original.apply(this, arguments);
                            }
                        };
                    });
                    // https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
                    // https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
                    function historyWrapper(original) {
                        return function () {
                            var url = arguments.length > 2 ? arguments[2] : undefined;
                            if (url) {
                                recordUrlChange(lastHref, String(url));
                            }
                            return original.apply(this, arguments);
                        };
                    }
                    instrument(_window.history, 'pushState', historyWrapper);
                    instrument(_window.history, 'replaceState', historyWrapper);
                })();
            }
        };
    }

    /* eslint-disable prefer-rest-params */
    function timers (_window) {
        if (_window === void 0) { _window = window; }
        return {
            load: function (client) {
                // Wrap timers
                (function () {
                    function instrumentTimer(wrapOpts) {
                        return function (original) {
                            // See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout
                            return function (func, delay) {
                                if (typeof func === 'function') {
                                    var args_1 = Array.prototype.slice.call(arguments, 2);
                                    func = client.__wrap(func, wrapOpts);
                                    return original(function () {
                                        func.apply(void 0, args_1);
                                    }, delay);
                                }
                                else {
                                    return original(func, delay);
                                }
                            };
                        };
                    }
                    instrument(_window, 'setTimeout', instrumentTimer({ component: 'setTimeout' }));
                    instrument(_window, 'setInterval', instrumentTimer({ component: 'setInterval' }));
                })();
            }
        };
    }

    function eventListeners (_window) {
        if (_window === void 0) { _window = window; }
        return {
            load: function (client) {
                // Wrap event listeners
                // Event targets borrowed from bugsnag-js:
                // See https://github.com/bugsnag/bugsnag-js/blob/d55af916a4d3c7757f979d887f9533fe1a04cc93/src/bugsnag.js#L542
                var targets = ['EventTarget', 'Window', 'Node', 'ApplicationCache', 'AudioTrackList', 'ChannelMergerNode', 'CryptoOperation', 'EventSource', 'FileReader', 'HTMLUnknownElement', 'IDBDatabase', 'IDBRequest', 'IDBTransaction', 'KeyOperation', 'MediaController', 'MessagePort', 'ModalWindow', 'Notification', 'SVGElementInstance', 'Screen', 'TextTrack', 'TextTrackCue', 'TextTrackList', 'WebSocket', 'WebSocketWorker', 'Worker', 'XMLHttpRequest', 'XMLHttpRequestEventTarget', 'XMLHttpRequestUpload'];
                targets.forEach(function (prop) {
                    var prototype = _window[prop] && _window[prop].prototype;
                    if (prototype && Object.prototype.hasOwnProperty.call(prototype, 'addEventListener')) {
                        instrument(prototype, 'addEventListener', function (original) {
                            var wrapOpts = { component: prop + ".prototype.addEventListener" };
                            // See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
                            return function (type, listener, useCapture, wantsUntrusted) {
                                try {
                                    if (listener && listener.handleEvent != null) {
                                        listener.handleEvent = client.__wrap(listener.handleEvent, wrapOpts);
                                    }
                                }
                                catch (e) {
                                    // Ignore 'Permission denied to access property "handleEvent"' errors.
                                    client.logger.error(e);
                                }
                                return original.call(this, type, client.__wrap(listener, wrapOpts), useCapture, wantsUntrusted);
                            };
                        });
                        instrument(prototype, 'removeEventListener', function (original) {
                            return function (type, listener, useCapture, wantsUntrusted) {
                                original.call(this, type, listener, useCapture, wantsUntrusted);
                                return original.call(this, type, client.__wrap(listener), useCapture, wantsUntrusted);
                            };
                        });
                    }
                });
            }
        };
    }

    var Honeybadger = /** @class */ (function (_super) {
        __extends(Honeybadger, _super);
        function Honeybadger(opts) {
            if (opts === void 0) { opts = {}; }
            var _this = _super.call(this, __assign({ async: true, maxErrors: null, projectRoot: window.location.protocol + '//' + window.location.host }, opts)) || this;
            /** @internal */
            _this.__errorsSent = 0;
            /** @internal */
            _this.__lastWrapErr = undefined;
            /** @internal */
            _this.__beforeNotifyHandlers = [
                function (notice) {
                    if (_this.__exceedsMaxErrors()) {
                        _this.logger.debug('Dropping notice: max errors exceeded', notice);
                        return false;
                    }
                    if (!notice.url) {
                        notice.url = document.URL;
                    }
                    return true;
                }
            ];
            return _this;
        }
        Honeybadger.prototype.configure = function (opts) {
            if (opts === void 0) { opts = {}; }
            return _super.prototype.configure.call(this, opts);
        };
        Honeybadger.prototype.resetMaxErrors = function () {
            return (this.__errorsSent = 0);
        };
        Honeybadger.prototype.factory = function (opts) {
            return new Honeybadger(opts);
        };
        /** @internal */
        Honeybadger.prototype.__buildPayload = function (notice) {
            var cgiData = {
                HTTP_USER_AGENT: undefined,
                HTTP_REFERER: undefined,
                HTTP_COOKIE: undefined
            };
            cgiData.HTTP_USER_AGENT = navigator.userAgent;
            if (document.referrer.match(/\S/)) {
                cgiData.HTTP_REFERER = document.referrer;
            }
            var cookiesObject;
            if (typeof notice.cookies === 'string') {
                cookiesObject = decodeCookie(notice.cookies);
            }
            else {
                cookiesObject = notice.cookies;
            }
            if (cookiesObject) {
                cgiData.HTTP_COOKIE = encodeCookie(filter(cookiesObject, this.config.filters));
            }
            var payload = _super.prototype.__buildPayload.call(this, notice);
            payload.request.cgi_data = merge(cgiData, payload.request.cgi_data);
            return payload;
        };
        /** @internal */
        Honeybadger.prototype.__send = function (notice) {
            var _this = this;
            this.__incrementErrorsCount();
            var payload = this.__buildPayload(notice);
            var handlers = Array.prototype.slice.call(this.__afterNotifyHandlers);
            if (notice.afterNotify) {
                handlers.unshift(notice.afterNotify);
            }
            try {
                var x_1 = new XMLHttpRequest();
                x_1.open('POST', endpoint(this.config, '/v1/notices/js'), this.config.async);
                x_1.setRequestHeader('X-API-Key', this.config.apiKey);
                x_1.setRequestHeader('Content-Type', 'application/json');
                x_1.setRequestHeader('Accept', 'text/json, application/json');
                x_1.send(JSON.stringify(sanitize(payload, this.config.maxObjectDepth)));
                x_1.onload = function () {
                    if (x_1.status !== 201) {
                        runAfterNotifyHandlers(notice, handlers, new Error("Bad HTTP response: " + x_1.status));
                        _this.logger.debug("Unable to send error report: " + x_1.status + ": " + x_1.statusText, x_1, notice);
                        return;
                    }
                    runAfterNotifyHandlers(merge(notice, {
                        id: JSON.parse(x_1.response).id
                    }), handlers);
                    _this.logger.debug('Error report sent', notice);
                };
            }
            catch (err) {
                runAfterNotifyHandlers(notice, handlers, err);
                this.logger.error('Unable to send error report: error while initializing request', err, notice);
            }
            return true;
        };
        /**
         * wrap always returns the same function so that callbacks can be removed via
         * removeEventListener.
         * @internal
         */
        Honeybadger.prototype.__wrap = function (f, opts) {
            if (opts === void 0) { opts = {}; }
            var func = f;
            if (!opts) {
                opts = {};
            }
            try {
                if (typeof func !== 'function') {
                    return func;
                }
                if (!objectIsExtensible(func)) {
                    return func;
                }
                if (!func.___hb) {
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
                    var client_1 = this;
                    func.___hb = function () {
                        var onErrorEnabled = client_1.config.enableUncaught;
                        // Catch if:
                        //   1. We explicitly want to catch (i.e. if the error could be
                        //      caught before reaching window.onerror)
                        //   2. The browser provides less information via the window.onerror
                        //      handler
                        //   3. The window.onerror handler is unavailable
                        if (opts.catch || preferCatch || !onErrorEnabled) {
                            try {
                                // eslint-disable-next-line prefer-rest-params
                                return func.apply(this, arguments);
                            }
                            catch (err) {
                                if (client_1.__lastWrapErr === err) {
                                    throw (err);
                                }
                                client_1.__lastWrapErr = err;
                                ignoreNextOnError();
                                client_1.addBreadcrumb(opts.component ? opts.component + ": " + err.name : err.name, {
                                    category: 'error',
                                    metadata: {
                                        message: err.message,
                                        name: err.name,
                                        stack: err.stack
                                    }
                                });
                                client_1.notify(err);
                                throw (err);
                            }
                        }
                        else {
                            // eslint-disable-next-line prefer-rest-params
                            return func.apply(this, arguments);
                        }
                    };
                }
                func.___hb.___hb = func.___hb;
                return func.___hb;
            }
            catch (_e) {
                return func;
            }
        };
        /** @internal */
        Honeybadger.prototype.__incrementErrorsCount = function () {
            return this.__errorsSent++;
        };
        /** @internal */
        Honeybadger.prototype.__exceedsMaxErrors = function () {
            return this.config.maxErrors && this.__errorsSent >= this.config.maxErrors;
        };
        return Honeybadger;
    }(Client));
    var browser = new Honeybadger({
        __plugins: [
            onError(),
            onUnhandledRejection(),
            timers(),
            eventListeners(),
            breadcrumbs()
        ]
    });

    return browser;

})));
//# sourceMappingURL=https://dev.to/assets/@honeybadger-io/js/dist/browser/honeybadger.js-142a56ee9ab632b117bd75cdeaec9263c5cdadd0e1ccd9adfbda8143713e75eb.map
//!
;
// I18n.js
// =======
//
// This small library provides the Rails I18n API on the Javascript.
// You don't actually have to use Rails (or even Ruby) to use I18n.js.
// Just make sure you export all translations in an object like this:
//
//     I18n.translations.en = {
//       hello: "Hello World"
//     };
//
// See tests for specific formatting like numbers and dates.
//

// Using UMD pattern from
// https://github.com/umdjs/umd#regular-module
// `returnExports.js` version
;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define("i18n", function(){ return factory(root);});
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(root);
  } else {
    // Browser globals (root is window)
    root.I18n = factory(root);
  }
}(this, function(global) {
  "use strict";

  // Use previously defined object if exists in current scope
  var I18n = global && global.I18n || {};

  // Just cache the Array#slice function.
  var slice = Array.prototype.slice;

  // Apply number padding.
  var padding = function(number) {
    return ("0" + number.toString()).substr(-2);
  };

  // Improved toFixed number rounding function with support for unprecise floating points
  // JavaScript's standard toFixed function does not round certain numbers correctly (for example 0.105 with precision 2).
  var toFixed = function(number, precision) {
    return decimalAdjust('round', number, -precision).toFixed(precision);
  };

  // Is a given variable an object?
  // Borrowed from Underscore.js
  var isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object'
  };

  var isFunction = function(func) {
    var type = typeof func;
    return type === 'function'
  };

  // Check if value is different than undefined and null;
  var isSet = function(value) {
    return typeof(value) !== 'undefined' && value !== null;
  };

  // Is a given value an array?
  // Borrowed from Underscore.js
  var isArray = function(val) {
    if (Array.isArray) {
      return Array.isArray(val);
    }
    return Object.prototype.toString.call(val) === '[object Array]';
  };

  var isString = function(val) {
    return typeof val === 'string' || Object.prototype.toString.call(val) === '[object String]';
  };

  var isNumber = function(val) {
    return typeof val === 'number' || Object.prototype.toString.call(val) === '[object Number]';
  };

  var isBoolean = function(val) {
    return val === true || val === false;
  };

  var isNull = function(val) {
    return val === null;
  };

  var decimalAdjust = function(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  };

  var lazyEvaluate = function(message, scope) {
    if (isFunction(message)) {
      return message(scope);
    } else {
      return message;
    }
  };

  var merge = function (dest, obj) {
    var key, value;
    for (key in obj) if (obj.hasOwnProperty(key)) {
      value = obj[key];
      if (isString(value) || isNumber(value) || isBoolean(value) || isArray(value) || isNull(value)) {
        dest[key] = value;
      } else {
        if (dest[key] == null) dest[key] = {};
        merge(dest[key], value);
      }
    }
    return dest;
  };

  // Set default days/months translations.
  var DATE = {
      day_names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    , abbr_day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    , month_names: [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    , abbr_month_names: [null, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    , meridian: ["AM", "PM"]
  };

  // Set default number format.
  var NUMBER_FORMAT = {
      precision: 3
    , separator: "."
    , delimiter: ","
    , strip_insignificant_zeros: false
  };

  // Set default currency format.
  var CURRENCY_FORMAT = {
      unit: "$"
    , precision: 2
    , format: "%u%n"
    , sign_first: true
    , delimiter: ","
    , separator: "."
  };

  // Set default percentage format.
  var PERCENTAGE_FORMAT = {
      unit: "%"
    , precision: 3
    , format: "%n%u"
    , separator: "."
    , delimiter: ""
  };

  // Set default size units.
  var SIZE_UNITS = [null, "kb", "mb", "gb", "tb"];

  // Other default options
  var DEFAULT_OPTIONS = {
    // Set default locale. This locale will be used when fallback is enabled and
    // the translation doesn't exist in a particular locale.
      defaultLocale: "en"
    // Set the current locale to `en`.
    , locale: "en"
    // Set the translation key separator.
    , defaultSeparator: "."
    // Set the placeholder format. Accepts `{{placeholder}}` and `%{placeholder}`.
    , placeholder: /(?:\{\{|%\{)(.*?)(?:\}\}?)/gm
    // Set if engine should fallback to the default locale when a translation
    // is missing.
    , fallbacks: false
    // Set the default translation object.
    , translations: {}
    // Set missing translation behavior. 'message' will display a message
    // that the translation is missing, 'guess' will try to guess the string
    , missingBehaviour: 'message'
    // if you use missingBehaviour with 'message', but want to know that the
    // string is actually missing for testing purposes, you can prefix the
    // guessed string by setting the value here. By default, no prefix!
    , missingTranslationPrefix: ''
  };

  // Set default locale. This locale will be used when fallback is enabled and
  // the translation doesn't exist in a particular locale.
  I18n.reset = function() {
    var key;
    for (key in DEFAULT_OPTIONS) {
      this[key] = DEFAULT_OPTIONS[key];
    }
  };

  // Much like `reset`, but only assign options if not already assigned
  I18n.initializeOptions = function() {
    var key;
    for (key in DEFAULT_OPTIONS) if (!isSet(this[key])) {
      this[key] = DEFAULT_OPTIONS[key];
    }
  };
  I18n.initializeOptions();

  // Return a list of all locales that must be tried before returning the
  // missing translation message. By default, this will consider the inline option,
  // current locale and fallback locale.
  //
  //     I18n.locales.get("de-DE");
  //     // ["de-DE", "de", "en"]
  //
  // You can define custom rules for any locale. Just make sure you return a array
  // containing all locales.
  //
  //     // Default the Wookie locale to English.
  //     I18n.locales["wk"] = function(locale) {
  //       return ["en"];
  //     };
  //
  I18n.locales = {};

  // Retrieve locales based on inline locale, current locale or default to
  // I18n's detection.
  I18n.locales.get = function(locale) {
    var result = this[locale] || this[I18n.locale] || this["default"];

    if (isFunction(result)) {
      result = result(locale);
    }

    if (isArray(result) === false) {
      result = [result];
    }

    return result;
  };

  // The default locale list.
  I18n.locales["default"] = function(locale) {
    var locales = []
      , list = []
    ;

    // Handle the inline locale option that can be provided to
    // the `I18n.t` options.
    if (locale) {
      locales.push(locale);
    }

    // Add the current locale to the list.
    if (!locale && I18n.locale) {
      locales.push(I18n.locale);
    }

    // Add the default locale if fallback strategy is enabled.
    if (I18n.fallbacks && I18n.defaultLocale) {
      locales.push(I18n.defaultLocale);
    }

    // Locale code format 1:
    // According to RFC4646 (https://www.ietf.org/rfc/rfc4646.txt)
    // language codes for Traditional Chinese should be `zh-Hant`
    //
    // But due to backward compatibility
    // We use older version of IETF language tag
    // @see https://www.w3.org/TR/html401/struct/dirlang.html
    // @see https://en.wikipedia.org/wiki/IETF_language_tag
    //
    // Format: `language-code = primary-code ( "-" subcode )*`
    //
    // primary-code uses ISO639-1
    // @see https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    // @see https://www.iso.org/iso/home/standards/language_codes.htm
    //
    // subcode uses ISO 3166-1 alpha-2
    // @see https://en.wikipedia.org/wiki/ISO_3166
    // @see https://www.iso.org/iso/country_codes.htm
    //
    // @note
    //   subcode can be in upper case or lower case
    //   defining it in upper case is a convention only


    // Locale code format 2:
    // Format: `code = primary-code ( "-" region-code )*`
    // primary-code uses ISO 639-1
    // script-code uses ISO 15924
    // region-code uses ISO 3166-1 alpha-2
    // Example: zh-Hant-TW, en-HK, zh-Hant-CN
    //
    // It is similar to RFC4646 (or actually the same),
    // but seems to be limited to language, script, region

    // Compute each locale with its country code.
    // So this will return an array containing
    // `de-DE` and `de`
    // or
    // `zh-hans-tw`, `zh-hans`, `zh`
    // locales.
    locales.forEach(function(locale) {
      var localeParts = locale.split("-");
      var firstFallback = null;
      var secondFallback = null;
      if (localeParts.length === 3) {
        firstFallback = [
          localeParts[0],
          localeParts[1]
        ].join("-");
        secondFallback = localeParts[0];
      }
      else if (localeParts.length === 2) {
        firstFallback = localeParts[0];
      }

      if (list.indexOf(locale) === -1) {
        list.push(locale);
      }

      if (! I18n.fallbacks) {
        return;
      }

      [
        firstFallback,
        secondFallback
      ].forEach(function(nullableFallbackLocale) {
        // We don't want null values
        if (typeof nullableFallbackLocale === "undefined") { return; }
        if (nullableFallbackLocale === null) { return; }
        // We don't want duplicate values
        //
        // Comparing with `locale` first is faster than
        // checking whether value's presence in the list
        if (nullableFallbackLocale === locale) { return; }
        if (list.indexOf(nullableFallbackLocale) !== -1) { return; }

        list.push(nullableFallbackLocale);
      });
    });

    // No locales set? English it is.
    if (!locales.length) {
      locales.push("en");
    }

    return list;
  };

  // Hold pluralization rules.
  I18n.pluralization = {};

  // Return the pluralizer for a specific locale.
  // If no specify locale is found, then I18n's default will be used.
  I18n.pluralization.get = function(locale) {
    return this[locale] || this[I18n.locale] || this["default"];
  };

  // The default pluralizer rule.
  // It detects the `zero`, `one`, and `other` scopes.
  I18n.pluralization["default"] = function(count) {
    switch (count) {
      case 0: return ["zero", "other"];
      case 1: return ["one"];
      default: return ["other"];
    }
  };

  // Return current locale. If no locale has been set, then
  // the current locale will be the default locale.
  I18n.currentLocale = function() {
    return this.locale || this.defaultLocale;
  };

  // Check if value is different than undefined and null;
  I18n.isSet = isSet;

  // Find and process the translation using the provided scope and options.
  // This is used internally by some functions and should not be used as an
  // public API.
  I18n.lookup = function(scope, options) {
    options = options || {};

    var locales = this.locales.get(options.locale).slice()
      , locale
      , scopes
      , fullScope
      , translations
    ;

    fullScope = this.getFullScope(scope, options);

    while (locales.length) {
      locale = locales.shift();
      scopes = fullScope.split(options.separator || this.defaultSeparator);
      translations = this.translations[locale];

      if (!translations) {
        continue;
      }
      while (scopes.length) {
        translations = translations[scopes.shift()];

        if (translations === undefined || translations === null) {
          break;
        }
      }

      if (translations !== undefined && translations !== null) {
        return translations;
      }
    }

    if (isSet(options.defaultValue)) {
      return lazyEvaluate(options.defaultValue, scope);
    }
  };

  // lookup pluralization rule key into translations
  I18n.pluralizationLookupWithoutFallback = function(count, locale, translations) {
    var pluralizer = this.pluralization.get(locale)
      , pluralizerKeys = pluralizer(count)
      , pluralizerKey
      , message;

    if (isObject(translations)) {
      while (pluralizerKeys.length) {
        pluralizerKey = pluralizerKeys.shift();
        if (isSet(translations[pluralizerKey])) {
          message = translations[pluralizerKey];
          break;
        }
      }
    }

    return message;
  };

  // Lookup dedicated to pluralization
  I18n.pluralizationLookup = function(count, scope, options) {
    options = options || {};
    var locales = this.locales.get(options.locale).slice()
      , locale
      , scopes
      , translations
      , message
    ;
    scope = this.getFullScope(scope, options);

    while (locales.length) {
      locale = locales.shift();
      scopes = scope.split(options.separator || this.defaultSeparator);
      translations = this.translations[locale];

      if (!translations) {
        continue;
      }

      while (scopes.length) {
        translations = translations[scopes.shift()];
        if (!isObject(translations)) {
          break;
        }
        if (scopes.length === 0) {
          message = this.pluralizationLookupWithoutFallback(count, locale, translations);
        }
      }
      if (typeof message !== "undefined" && message !== null) {
        break;
      }
    }

    if (typeof message === "undefined" || message === null) {
      if (isSet(options.defaultValue)) {
        if (isObject(options.defaultValue)) {
          message = this.pluralizationLookupWithoutFallback(count, options.locale, options.defaultValue);
        } else {
          message = options.defaultValue;
        }
        translations = options.defaultValue;
      }
    }

    return { message: message, translations: translations };
  };

  // Rails changed the way the meridian is stored.
  // It started with `date.meridian` returning an array,
  // then it switched to `time.am` and `time.pm`.
  // This function abstracts this difference and returns
  // the correct meridian or the default value when none is provided.
  I18n.meridian = function() {
    var time = this.lookup("time");
    var date = this.lookup("date");

    if (time && time.am && time.pm) {
      return [time.am, time.pm];
    } else if (date && date.meridian) {
      return date.meridian;
    } else {
      return DATE.meridian;
    }
  };

  // Merge serveral hash options, checking if value is set before
  // overwriting any value. The precedence is from left to right.
  //
  //     I18n.prepareOptions({name: "John Doe"}, {name: "Mary Doe", role: "user"});
  //     #=> {name: "John Doe", role: "user"}
  //
  I18n.prepareOptions = function() {
    var args = slice.call(arguments)
      , options = {}
      , subject
    ;

    while (args.length) {
      subject = args.shift();

      if (typeof(subject) != "object") {
        continue;
      }

      for (var attr in subject) {
        if (!subject.hasOwnProperty(attr)) {
          continue;
        }

        if (isSet(options[attr])) {
          continue;
        }

        options[attr] = subject[attr];
      }
    }

    return options;
  };

  // Generate a list of translation options for default fallbacks.
  // `defaultValue` is also deleted from options as it is returned as part of
  // the translationOptions array.
  I18n.createTranslationOptions = function(scope, options) {
    var translationOptions = [{scope: scope}];

    // Defaults should be an array of hashes containing either
    // fallback scopes or messages
    if (isSet(options.defaults)) {
      translationOptions = translationOptions.concat(options.defaults);
    }

    // Maintain support for defaultValue. Since it is always a message
    // insert it in to the translation options as such.
    if (isSet(options.defaultValue)) {
      translationOptions.push({ message: options.defaultValue });
    }

    return translationOptions;
  };

  // Translate the given scope with the provided options.
  I18n.translate = function(scope, options) {
    options = options || {};

    var translationOptions = this.createTranslationOptions(scope, options);

    var translation;
    var usedScope = scope;

    var optionsWithoutDefault = this.prepareOptions(options)
    delete optionsWithoutDefault.defaultValue

    // Iterate through the translation options until a translation
    // or message is found.
    var translationFound =
      translationOptions.some(function(translationOption) {
        if (isSet(translationOption.scope)) {
          usedScope = translationOption.scope;
          translation = this.lookup(usedScope, optionsWithoutDefault);
        } else if (isSet(translationOption.message)) {
          translation = lazyEvaluate(translationOption.message, scope);
        }

        if (translation !== undefined && translation !== null) {
          return true;
        }
      }, this);

    if (!translationFound) {
      return this.missingTranslation(scope, options);
    }

    if (typeof(translation) === "string") {
      translation = this.interpolate(translation, options);
    } else if (isArray(translation)) {
      translation = translation.map(function(t) {
        return (typeof(t) === "string" ? this.interpolate(t, options) : t);
      }, this);
    } else if (isObject(translation) && isSet(options.count)) {
      translation = this.pluralize(options.count, usedScope, options);
    }

    return translation;
  };

  // This function interpolates the all variables in the given message.
  I18n.interpolate = function(message, options) {
    if (message == null) {
      return message;
    }

    options = options || {};
    var matches = message.match(this.placeholder)
      , placeholder
      , value
      , name
      , regex
    ;

    if (!matches) {
      return message;
    }

    while (matches.length) {
      placeholder = matches.shift();
      name = placeholder.replace(this.placeholder, "$1");

      if (isSet(options[name])) {
        value = options[name].toString().replace(/\$/gm, "_#$#_");
      } else if (name in options) {
        value = this.nullPlaceholder(placeholder, message, options);
      } else {
        value = this.missingPlaceholder(placeholder, message, options);
      }

      regex = new RegExp(placeholder.replace(/{/gm, "\\{").replace(/}/gm, "\\}"));
      message = message.replace(regex, value);
    }

    return message.replace(/_#\$#_/g, "$");
  };

  // Pluralize the given scope using the `count` value.
  // The pluralized translation may have other placeholders,
  // which will be retrieved from `options`.
  I18n.pluralize = function(count, scope, options) {
    options = this.prepareOptions({count: String(count)}, options)
    var pluralizer, result;

    result = this.pluralizationLookup(count, scope, options);
    if (typeof result.translations === "undefined" || result.translations == null) {
      return this.missingTranslation(scope, options);
    }

    if (typeof result.message !== "undefined" && result.message != null) {
      return this.interpolate(result.message, options);
    }
    else {
      pluralizer = this.pluralization.get(options.locale);
      return this.missingTranslation(scope + '.' + pluralizer(count)[0], options);
    }
  };

  // Return a missing translation message for the given parameters.
  I18n.missingTranslation = function(scope, options) {
    //guess intended string
    if(this.missingBehaviour === 'guess'){
      //get only the last portion of the scope
      var s = scope.split('.').slice(-1)[0];
      //replace underscore with space && camelcase with space and lowercase letter
      return (this.missingTranslationPrefix.length > 0 ? this.missingTranslationPrefix : '') +
          s.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,
          function(match, p1, p2) {return p1 + ' ' + p2.toLowerCase()} );
    }

    var localeForTranslation = (options != null && options.locale != null) ? options.locale : this.currentLocale();
    var fullScope           = this.getFullScope(scope, options);
    var fullScopeWithLocale = [localeForTranslation, fullScope].join(options.separator || this.defaultSeparator);

    return '[missing "' + fullScopeWithLocale + '" translation]';
  };

  // Return a missing placeholder message for given parameters
  I18n.missingPlaceholder = function(placeholder, message, options) {
    return "[missing " + placeholder + " value]";
  };

  I18n.nullPlaceholder = function() {
    return I18n.missingPlaceholder.apply(I18n, arguments);
  };

  // Format number using localization rules.
  // The options will be retrieved from the `number.format` scope.
  // If this isn't present, then the following options will be used:
  //
  // - `precision`: `3`
  // - `separator`: `"."`
  // - `delimiter`: `","`
  // - `strip_insignificant_zeros`: `false`
  //
  // You can also override these options by providing the `options` argument.
  //
  I18n.toNumber = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.format")
      , NUMBER_FORMAT
    );

    var negative = number < 0
      , string = toFixed(Math.abs(number), options.precision).toString()
      , parts = string.split(".")
      , precision
      , buffer = []
      , formattedNumber
      , format = options.format || "%n"
      , sign = negative ? "-" : ""
    ;

    number = parts[0];
    precision = parts[1];

    while (number.length > 0) {
      buffer.unshift(number.substr(Math.max(0, number.length - 3), 3));
      number = number.substr(0, number.length -3);
    }

    formattedNumber = buffer.join(options.delimiter);

    if (options.strip_insignificant_zeros && precision) {
      precision = precision.replace(/0+$/, "");
    }

    if (options.precision > 0 && precision) {
      formattedNumber += options.separator + precision;
    }

    if (options.sign_first) {
      format = "%s" + format;
    }
    else {
      format = format.replace("%n", "%s%n");
    }

    formattedNumber = format
      .replace("%u", options.unit)
      .replace("%n", formattedNumber)
      .replace("%s", sign)
    ;

    return formattedNumber;
  };

  // Format currency with localization rules.
  // The options will be retrieved from the `number.currency.format` and
  // `number.format` scopes, in that order.
  //
  // Any missing option will be retrieved from the `I18n.toNumber` defaults and
  // the following options:
  //
  // - `unit`: `"$"`
  // - `precision`: `2`
  // - `format`: `"%u%n"`
  // - `delimiter`: `","`
  // - `separator`: `"."`
  //
  // You can also override these options by providing the `options` argument.
  //
  I18n.toCurrency = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.currency.format", options)
      , this.lookup("number.format", options)
      , CURRENCY_FORMAT
    );

    return this.toNumber(number, options);
  };

  // Localize several values.
  // You can provide the following scopes: `currency`, `number`, or `percentage`.
  // If you provide a scope that matches the `/^(date|time)/` regular expression
  // then the `value` will be converted by using the `I18n.toTime` function.
  //
  // It will default to the value's `toString` function.
  //
  I18n.localize = function(scope, value, options) {
    options || (options = {});

    switch (scope) {
      case "currency":
        return this.toCurrency(value, options);
      case "number":
        scope = this.lookup("number.format", options);
        return this.toNumber(value, scope);
      case "percentage":
        return this.toPercentage(value, options);
      default:
        var localizedValue;

        if (scope.match(/^(date|time)/)) {
          localizedValue = this.toTime(scope, value, options);
        } else {
          localizedValue = value.toString();
        }

        return this.interpolate(localizedValue, options);
    }
  };

  // Parse a given `date` string into a JavaScript Date object.
  // This function is time zone aware.
  //
  // The following string formats are recognized:
  //
  //    yyyy-mm-dd
  //    yyyy-mm-dd[ T]hh:mm::ss
  //    yyyy-mm-dd[ T]hh:mm::ss
  //    yyyy-mm-dd[ T]hh:mm::ssZ
  //    yyyy-mm-dd[ T]hh:mm::ss+0000
  //    yyyy-mm-dd[ T]hh:mm::ss+00:00
  //    yyyy-mm-dd[ T]hh:mm::ss.123Z
  //
  I18n.parseDate = function(date) {
    var matches, convertedDate, fraction;
    // A date input of `null` or `undefined` will be returned as-is
    if (date == null) {
      return date;
    }
    // we have a date, so just return it.
    if (typeof(date) === "object") {
      return date;
    }

    matches = date.toString().match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})([\.,]\d{1,3})?)?(Z|\+00:?00)?/);

    if (matches) {
      for (var i = 1; i <= 6; i++) {
        matches[i] = parseInt(matches[i], 10) || 0;
      }

      // month starts on 0
      matches[2] -= 1;

      fraction = matches[7] ? 1000 * ("0" + matches[7]) : null;

      if (matches[8]) {
        convertedDate = new Date(Date.UTC(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6], fraction));
      } else {
        convertedDate = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6], fraction);
      }
    } else if (typeof(date) == "number") {
      // UNIX timestamp
      convertedDate = new Date();
      convertedDate.setTime(date);
    } else if (date.match(/([A-Z][a-z]{2}) ([A-Z][a-z]{2}) (\d+) (\d+:\d+:\d+) ([+-]\d+) (\d+)/)) {
      // This format `Wed Jul 20 13:03:39 +0000 2011` is parsed by
      // webkit/firefox, but not by IE, so we must parse it manually.
      convertedDate = new Date();
      convertedDate.setTime(Date.parse([
        RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$6, RegExp.$4, RegExp.$5
      ].join(" ")));
    } else if (date.match(/\d+ \d+:\d+:\d+ [+-]\d+ \d+/)) {
      // a valid javascript format with timezone info
      convertedDate = new Date();
      convertedDate.setTime(Date.parse(date));
    } else {
      // an arbitrary javascript string
      convertedDate = new Date();
      convertedDate.setTime(Date.parse(date));
    }

    return convertedDate;
  };

  // Formats time according to the directives in the given format string.
  // The directives begins with a percent (%) character. Any text not listed as a
  // directive will be passed through to the output string.
  //
  // The accepted formats are:
  //
  //     %a     - The abbreviated weekday name (Sun)
  //     %A     - The full weekday name (Sunday)
  //     %b     - The abbreviated month name (Jan)
  //     %B     - The full month name (January)
  //     %c     - The preferred local date and time representation
  //     %d     - Day of the month (01..31)
  //     %-d    - Day of the month (1..31)
  //     %H     - Hour of the day, 24-hour clock (00..23)
  //     %-H/%k - Hour of the day, 24-hour clock (0..23)
  //     %I     - Hour of the day, 12-hour clock (01..12)
  //     %-I/%l - Hour of the day, 12-hour clock (1..12)
  //     %m     - Month of the year (01..12)
  //     %-m    - Month of the year (1..12)
  //     %M     - Minute of the hour (00..59)
  //     %-M    - Minute of the hour (0..59)
  //     %p     - Meridian indicator (AM  or  PM)
  //     %P     - Meridian indicator (am  or  pm)
  //     %S     - Second of the minute (00..60)
  //     %-S    - Second of the minute (0..60)
  //     %w     - Day of the week (Sunday is 0, 0..6)
  //     %y     - Year without a century (00..99)
  //     %-y    - Year without a century (0..99)
  //     %Y     - Year with century
  //     %z/%Z  - Timezone offset (+0545)
  //
  I18n.strftime = function(date, format, options) {
    var options = this.lookup("date", options)
      , meridianOptions = I18n.meridian()
    ;

    if (!options) {
      options = {};
    }

    options = this.prepareOptions(options, DATE);

    if (isNaN(date.getTime())) {
      throw new Error('I18n.strftime() requires a valid date object, but received an invalid date.');
    }

    var weekDay = date.getDay()
      , day = date.getDate()
      , year = date.getFullYear()
      , month = date.getMonth() + 1
      , hour = date.getHours()
      , hour12 = hour
      , meridian = hour > 11 ? 1 : 0
      , secs = date.getSeconds()
      , mins = date.getMinutes()
      , offset = date.getTimezoneOffset()
      , absOffsetHours = Math.floor(Math.abs(offset / 60))
      , absOffsetMinutes = Math.abs(offset) - (absOffsetHours * 60)
      , timezoneoffset = (offset > 0 ? "-" : "+") +
          (absOffsetHours.toString().length < 2 ? "0" + absOffsetHours : absOffsetHours) +
          (absOffsetMinutes.toString().length < 2 ? "0" + absOffsetMinutes : absOffsetMinutes)
    ;

    if (hour12 > 12) {
      hour12 = hour12 - 12;
    } else if (hour12 === 0) {
      hour12 = 12;
    }

    format = format.replace("%a", options.abbr_day_names[weekDay]);
    format = format.replace("%A", options.day_names[weekDay]);
    format = format.replace("%b", options.abbr_month_names[month]);
    format = format.replace("%B", options.month_names[month]);
    format = format.replace("%d", padding(day));
    format = format.replace("%e", day);
    format = format.replace("%-d", day);
    format = format.replace("%H", padding(hour));
    format = format.replace("%-H", hour);
    format = format.replace("%k", hour);
    format = format.replace("%I", padding(hour12));
    format = format.replace("%-I", hour12);
    format = format.replace("%l", hour12);
    format = format.replace("%m", padding(month));
    format = format.replace("%-m", month);
    format = format.replace("%M", padding(mins));
    format = format.replace("%-M", mins);
    format = format.replace("%p", meridianOptions[meridian]);
    format = format.replace("%P", meridianOptions[meridian].toLowerCase());
    format = format.replace("%S", padding(secs));
    format = format.replace("%-S", secs);
    format = format.replace("%w", weekDay);
    format = format.replace("%y", padding(year));
    format = format.replace("%-y", padding(year).replace(/^0+/, ""));
    format = format.replace("%Y", year);
    format = format.replace("%z", timezoneoffset);
    format = format.replace("%Z", timezoneoffset);

    return format;
  };

  // Convert the given dateString into a formatted date.
  I18n.toTime = function(scope, dateString, options) {
    var date = this.parseDate(dateString)
      , format = this.lookup(scope, options)
    ;

    // A date input of `null` or `undefined` will be returned as-is
    if (date == null) {
      return date;
    }

    var date_string = date.toString()
    if (date_string.match(/invalid/i)) {
      return date_string;
    }

    if (!format) {
      return date_string;
    }

    return this.strftime(date, format, options);
  };

  // Convert a number into a formatted percentage value.
  I18n.toPercentage = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.percentage.format", options)
      , this.lookup("number.format", options)
      , PERCENTAGE_FORMAT
    );

    return this.toNumber(number, options);
  };

  // Convert a number into a readable size representation.
  I18n.toHumanSize = function(number, options) {
    var kb = 1024
      , size = number
      , iterations = 0
      , unit
      , precision
      , fullScope
    ;

    while (size >= kb && iterations < 4) {
      size = size / kb;
      iterations += 1;
    }

    if (iterations === 0) {
      fullScope = this.getFullScope("number.human.storage_units.units.byte", options);
      unit = this.t(fullScope, {count: size});
      precision = 0;
    } else {
      fullScope = this.getFullScope("number.human.storage_units.units." + SIZE_UNITS[iterations], options);
      unit = this.t(fullScope);
      precision = (size - Math.floor(size) === 0) ? 0 : 1;
    }

    options = this.prepareOptions(
        options
      , {unit: unit, precision: precision, format: "%n%u", delimiter: ""}
    );

    return this.toNumber(size, options);
  };

  I18n.getFullScope = function(scope, options) {
    options = options || {};

    // Deal with the scope as an array.
    if (isArray(scope)) {
      scope = scope.join(options.separator || this.defaultSeparator);
    }

    // Deal with the scope option provided through the second argument.
    //
    //    I18n.t('hello', {scope: 'greetings'});
    //
    if (options.scope) {
      scope = [options.scope, scope].join(options.separator || this.defaultSeparator);
    }

    return scope;
  };
  /**
   * Merge obj1 with obj2 (shallow merge), without modifying inputs
   * @param {Object} obj1
   * @param {Object} obj2
   * @returns {Object} Merged values of obj1 and obj2
   *
   * In order to support ES3, `Object.prototype.hasOwnProperty.call` is used
   * Idea is from:
   * https://stackoverflow.com/questions/8157700/object-has-no-hasownproperty-method-i-e-its-undefined-ie8
   */
  I18n.extend = function ( obj1, obj2 ) {
    if (typeof(obj1) === "undefined" && typeof(obj2) === "undefined") {
      return {};
    }
    return merge(obj1, obj2);
  };

  // Set aliases, so we can save some typing.
  I18n.t = I18n.translate.bind(I18n);
  I18n.l = I18n.localize.bind(I18n);
  I18n.p = I18n.pluralize.bind(I18n);

  return I18n;
}));
/*!
 * Ahoy.js
 * Simple, powerful JavaScript analytics
 * https://github.com/ankane/ahoy.js
 * v0.4.0
 * MIT License
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.ahoy = factory());
}(this, (function () { 'use strict';

  // https://www.quirksmode.org/js/cookies.html

  var Cookies = {
    set: function (name, value, ttl, domain) {
      var expires = "";
      var cookieDomain = "";
      if (ttl) {
        var date = new Date();
        date.setTime(date.getTime() + (ttl * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
      }
      if (domain) {
        cookieDomain = "; domain=" + domain;
      }
      document.cookie = name + "=" + escape(value) + expires + cookieDomain + "; path=/; samesite=lax";
    },
    get: function (name) {
      var i, c;
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (i = 0; i < ca.length; i++) {
        c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          return unescape(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    }
  };

  var config = {
    urlPrefix: "",
    visitsUrl: "/ahoy/visits",
    eventsUrl: "/ahoy/events",
    page: null,
    platform: "Web",
    useBeacon: true,
    startOnReady: true,
    trackVisits: true,
    cookies: true,
    cookieDomain: null,
    headers: {},
    visitParams: {},
    withCredentials: false,
    visitDuration: 4 * 60, // default 4 hours
    visitorDuration: 2 * 365 * 24 * 60 // default 2 years
  };

  var ahoy = window.ahoy || window.Ahoy || {};

  ahoy.configure = function (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        config[key] = options[key];
      }
    }
  };

  // legacy
  ahoy.configure(ahoy);

  var $ = window.jQuery || window.Zepto || window.$;
  var visitId, visitorId, track;
  var isReady = false;
  var queue = [];
  var canStringify = typeof(JSON) !== "undefined" && typeof(JSON.stringify) !== "undefined";
  var eventQueue = [];

  function visitsUrl() {
    return config.urlPrefix + config.visitsUrl;
  }

  function eventsUrl() {
    return config.urlPrefix + config.eventsUrl;
  }

  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  function canTrackNow() {
    return (config.useBeacon || config.trackNow) && isEmpty(config.headers) && canStringify && typeof(window.navigator.sendBeacon) !== "undefined" && !config.withCredentials;
  }

  function serialize(object) {
    var data = new FormData();
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        data.append(key, object[key]);
      }
    }
    return data;
  }

  // cookies

  function setCookie(name, value, ttl) {
    Cookies.set(name, value, ttl, config.cookieDomain || config.domain);
  }

  function getCookie(name) {
    return Cookies.get(name);
  }

  function destroyCookie(name) {
    Cookies.set(name, "", -1);
  }

  function log(message) {
    if (getCookie("ahoy_debug")) {
      window.console.log(message);
    }
  }

  function setReady() {
    var callback;
    while ((callback = queue.shift())) {
      callback();
    }
    isReady = true;
  }

  ahoy.ready = function (callback) {
    if (isReady) {
      callback();
    } else {
      queue.push(callback);
    }
  };

  function matchesSelector(element, selector) {
    var matches = element.matches ||
      element.matchesSelector ||
      element.mozMatchesSelector ||
      element.msMatchesSelector ||
      element.oMatchesSelector ||
      element.webkitMatchesSelector;

    if (matches) {
      if (matches.apply(element, [selector])) {
        return element;
      } else if (element.parentElement) {
        return matchesSelector(element.parentElement, selector);
      }
      return null;
    } else {
      log("Unable to match");
      return null;
    }
  }

  function onEvent(eventName, selector, callback) {
    document.addEventListener(eventName, function (e) {
      var matchedElement = matchesSelector(e.target, selector);
      if (matchedElement) {
        callback.call(matchedElement, e);
      }
    });
  }

  // http://beeker.io/jquery-document-ready-equivalent-vanilla-javascript
  function documentReady(callback) {
    if (document.readyState === "interactive" || document.readyState === "complete") {
      setTimeout(callback, 0);
    } else {
      document.addEventListener("DOMContentLoaded", callback);
    }
  }

  // https://stackoverflow.com/a/2117523/1177228
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  function saveEventQueue() {
    if (config.cookies && canStringify) {
      setCookie("ahoy_events", JSON.stringify(eventQueue), 1);
    }
  }

  // from rails-ujs

  function csrfToken() {
    var meta = document.querySelector("meta[name=csrf-token]");
    return meta && meta.content;
  }

  function csrfParam() {
    var meta = document.querySelector("meta[name=csrf-param]");
    return meta && meta.content;
  }

  function CSRFProtection(xhr) {
    var token = csrfToken();
    if (token) { xhr.setRequestHeader("X-CSRF-Token", token); }
  }

  function sendRequest(url, data, success) {
    if (canStringify) {
      if ($ && $.ajax) {
        $.ajax({
          type: "POST",
          url: url,
          data: JSON.stringify(data),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          beforeSend: CSRFProtection,
          success: success,
          headers: config.headers,
          xhrFields: {
            withCredentials: config.withCredentials
          }
        });
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.withCredentials = config.withCredentials;
        xhr.setRequestHeader("Content-Type", "application/json");
        for (var header in config.headers) {
          if (config.headers.hasOwnProperty(header)) {
            xhr.setRequestHeader(header, config.headers[header]);
          }
        }
        xhr.onload = function() {
          if (xhr.status === 200) {
            success();
          }
        };
        CSRFProtection(xhr);
        xhr.send(JSON.stringify(data));
      }
    }
  }

  function eventData(event) {
    var data = {
      events: [event]
    };
    if (config.cookies) {
      data.visit_token = event.visit_token;
      data.visitor_token = event.visitor_token;
    }
    delete event.visit_token;
    delete event.visitor_token;
    return data;
  }

  function trackEvent(event) {
    ahoy.ready( function () {
      sendRequest(eventsUrl(), eventData(event), function() {
        // remove from queue
        for (var i = 0; i < eventQueue.length; i++) {
          if (eventQueue[i].id == event.id) {
            eventQueue.splice(i, 1);
            break;
          }
        }
        saveEventQueue();
      });
    });
  }

  function trackEventNow(event) {
    ahoy.ready( function () {
      var data = eventData(event);
      var param = csrfParam();
      var token = csrfToken();
      if (param && token) { data[param] = token; }
      // stringify so we keep the type
      data.events_json = JSON.stringify(data.events);
      delete data.events;
      window.navigator.sendBeacon(eventsUrl(), serialize(data));
    });
  }

  function page() {
    return config.page || window.location.pathname;
  }

  function presence(str) {
    return (str && str.length > 0) ? str : null;
  }

  function cleanObject(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] === null) {
          delete obj[key];
        }
      }
    }
    return obj;
  }

  function eventProperties() {
    return cleanObject({
      tag: this.tagName.toLowerCase(),
      id: presence(this.id),
      "class": presence(this.className),
      page: page(),
      section: getClosestSection(this)
    });
  }

  function getClosestSection(element) {
    for ( ; element && element !== document; element = element.parentNode) {
      if (element.hasAttribute('data-section')) {
        return element.getAttribute('data-section');
      }
    }

    return null;
  }

  function createVisit() {
    isReady = false;

    visitId = ahoy.getVisitId();
    visitorId = ahoy.getVisitorId();
    track = getCookie("ahoy_track");

    if (config.cookies === false || config.trackVisits === false) {
      log("Visit tracking disabled");
      setReady();
    } else if (visitId && visitorId && !track) {
      // TODO keep visit alive?
      log("Active visit");
      setReady();
    } else {
      if (!visitId) {
        visitId = generateId();
        setCookie("ahoy_visit", visitId, config.visitDuration);
      }

      // make sure cookies are enabled
      if (getCookie("ahoy_visit")) {
        log("Visit started");

        if (!visitorId) {
          visitorId = generateId();
          setCookie("ahoy_visitor", visitorId, config.visitorDuration);
        }

        var data = {
          visit_token: visitId,
          visitor_token: visitorId,
          platform: config.platform,
          landing_page: window.location.href,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          js: true
        };

        // referrer
        if (document.referrer.length > 0) {
          data.referrer = document.referrer;
        }

        for (var key in config.visitParams) {
          if (config.visitParams.hasOwnProperty(key)) {
            data[key] = config.visitParams[key];
          }
        }

        log(data);

        sendRequest(visitsUrl(), data, function () {
          // wait until successful to destroy
          destroyCookie("ahoy_track");
          setReady();
        });
      } else {
        log("Cookies disabled");
        setReady();
      }
    }
  }

  ahoy.getVisitId = ahoy.getVisitToken = function () {
    return getCookie("ahoy_visit");
  };

  ahoy.getVisitorId = ahoy.getVisitorToken = function () {
    return getCookie("ahoy_visitor");
  };

  ahoy.reset = function () {
    destroyCookie("ahoy_visit");
    destroyCookie("ahoy_visitor");
    destroyCookie("ahoy_events");
    destroyCookie("ahoy_track");
    return true;
  };

  ahoy.debug = function (enabled) {
    if (enabled === false) {
      destroyCookie("ahoy_debug");
    } else {
      setCookie("ahoy_debug", "t", 365 * 24 * 60); // 1 year
    }
    return true;
  };

  ahoy.track = function (name, properties) {
    // generate unique id
    var event = {
      name: name,
      properties: properties || {},
      time: (new Date()).getTime() / 1000.0,
      id: generateId(),
      js: true
    };

    ahoy.ready( function () {
      if (config.cookies && !ahoy.getVisitId()) {
        createVisit();
      }

      ahoy.ready( function () {
        log(event);

        event.visit_token = ahoy.getVisitId();
        event.visitor_token = ahoy.getVisitorId();

        if (canTrackNow()) {
          trackEventNow(event);
        } else {
          eventQueue.push(event);
          saveEventQueue();

          // wait in case navigating to reduce duplicate events
          setTimeout( function () {
            trackEvent(event);
          }, 1000);
        }
      });
    });

    return true;
  };

  ahoy.trackView = function (additionalProperties) {
    var properties = {
      url: window.location.href,
      title: document.title,
      page: page()
    };

    if (additionalProperties) {
      for(var propName in additionalProperties) {
        if (additionalProperties.hasOwnProperty(propName)) {
          properties[propName] = additionalProperties[propName];
        }
      }
    }
    ahoy.track("$view", properties);
  };

  ahoy.trackClicks = function (selector) {
    if (selector === undefined) {
      throw new Error("Missing selector");
    }
    onEvent("click", selector, function (e) {
      var properties = eventProperties.call(this, e);
      properties.text = properties.tag == "input" ? this.value : (this.textContent || this.innerText || this.innerHTML).replace(/[\s\r\n]+/g, " ").trim();
      properties.href = this.href;
      ahoy.track("$click", properties);
    });
  };

  ahoy.trackSubmits = function (selector) {
    if (selector === undefined) {
      throw new Error("Missing selector");
    }
    onEvent("submit", selector, function (e) {
      var properties = eventProperties.call(this, e);
      ahoy.track("$submit", properties);
    });
  };

  ahoy.trackChanges = function (selector) {
    log("trackChanges is deprecated and will be removed in 0.5.0");
    if (selector === undefined) {
      throw new Error("Missing selector");
    }
    onEvent("change", selector, function (e) {
      var properties = eventProperties.call(this, e);
      ahoy.track("$change", properties);
    });
  };

  // push events from queue
  try {
    eventQueue = JSON.parse(getCookie("ahoy_events") || "[]");
  } catch (e) {
    // do nothing
  }

  for (var i = 0; i < eventQueue.length; i++) {
    trackEvent(eventQueue[i]);
  }

  ahoy.start = function () {
    createVisit();

    ahoy.start = function () {};
  };

  documentReady(function() {
    if (config.startOnReady) {
      ahoy.start();
    }
  });

  return ahoy;

})));









I18n.defaultLocale = 'en';
I18n.locale = document.body.dataset.locale;
I18n.translations = JSON.parse(document.getElementById('i18n-translations').dataset.translations);
var instantClick
  , InstantClick = instantClick = function(document, location, $userAgent) {
  // Internal variables
  var $isChromeForIOS = $userAgent.indexOf(' CriOS/') > -1
    , $currentLocationWithoutHash
    , $urlToPreload
    , $preloadTimer
    , $lastTouchTimestamp

  // Preloading-related variables
    , $history = {}
    , $xhr
    , $url = false
    , $mustRedirect = false
    , $fetchedBodies = {}
    , $timing = {}
    , $isPreloading = false
    , $isWaitingForCompletion = false
    , $trackedAssets = []

  // Variables defined by public functions
    , $preloadOnMousedown
    , $delayBeforePreload
    , $eventsCallbacks = {
        fetch: [],
        receive: [],
        wait: [],
        change: [],
        restore: []
      }


  ////////// HELPERS //////////


  function removeHash(url) {
    var index = url.indexOf('#')
    if (index < 0) {
      return url
    }
    return url.substr(0, index)
  }

  function getLinkTarget(target) {
    while (target && target.nodeName != 'A') {
      target = target.parentNode
    }
    return target
  }

  function isNotPreloadable(elem) {
    do {
      if (!elem.hasAttribute) { // Parent of <html>
        break
      }
      if (elem.hasAttribute('data-instant')) {
        return false
      }
      if (elem.hasAttribute('data-no-instant')) {
        return true
      }
    }
    while (elem = elem.parentNode)
    return false
  }

  function isPreloadable(a) {
    var domain = location.protocol + '//' + location.host

    if (a.target // target="_blank" etc.
        || a.hasAttribute('download')
        || a.href.indexOf(domain + '/') != 0 // Another domain, or no href attribute
        || (a.href.indexOf('#') > -1
            && removeHash(a.href) == $currentLocationWithoutHash) // Anchor
        || isNotPreloadable(a)
       ) {
      return false
    }
    return true
  }

  function triggerPageEvent(eventType, arg1, arg2, arg3) {
    var returnValue = false
    for (var i = 0; i < $eventsCallbacks[eventType].length; i++) {
      if (eventType == 'receive') {
        var altered = $eventsCallbacks[eventType][i](arg1, arg2, arg3)
        if (altered) {
          /* Update args for the next iteration of the loop. */
          if ('body' in altered) {
            arg2 = altered.body
          }
          if ('title' in altered) {
            arg3 = altered.title
          }

          returnValue = altered
        }
      }
      else {
        $eventsCallbacks[eventType][i](arg1, arg2, arg3)
      }
    }
    return returnValue
  }

  function changePage(title, body, newUrl, scrollY, pop) {
    var pageContentDiv = document.getElementById("page-content");
    var memberMenuButton = document.getElementById("member-menu-button")
    if (memberMenuButton) {
      memberMenuButton.classList.remove('showing')
    }
    document.body.replaceChild(body, pageContentDiv)

    var prog = document.getElementById("navigation-progress");
    prog.classList.remove("showing");

    if (newUrl) {
      const routeChangeTarget = document.getElementById('route-change-target');
      if(routeChangeTarget) {
        routeChangeTarget.focus();
      }
      document.getElementById('page-route-change').textContent = title;
      history.pushState(null, null, newUrl.replace("?samepage=true","").replace("&samepage=true",""))

      var hashIndex = newUrl.indexOf('#'),
          hashElem = hashIndex > -1 && (
            document.getElementById(newUrl.substr(hashIndex + 1)) ||
            document.querySelector(`[name=${newUrl.substr(hashIndex + 1)}].anchor`)
          ),
          offset = 0,
          samePage = newUrl.indexOf("samepage=true") > -1;

      if (hashElem) {
        while (hashElem.offsetParent) {
          offset += hashElem.offsetTop

          hashElem = hashElem.offsetParent
        }
      }
      if (!samePage){
        scrollTo(0, offset)
      }


      $currentLocationWithoutHash = removeHash(newUrl)
    }
    else {
      scrollTo(0, scrollY)
    }

    if ($isChromeForIOS && document.title == title) {
      /* Chrome for iOS:
       *
       * 1. Removes title on pushState, so the title needs to be set after.
       *
       * 2. Will not set the title if it's identical when trimmed, so
       *    appending a space won't do; but a non-breaking space works.
       */
      document.title = title + String.fromCharCode(160)
    }
    else {
      document.title = title
    }

    instantanize()
    if (pop) {
      triggerPageEvent('restore')
    }
    else {
      triggerPageEvent('change', false)
    }
  }

  function setPreloadingAsHalted() {
    $isPreloading = false
    $isWaitingForCompletion = false
  }

  function removeNoscriptTags(html) {
    /* Must be done on text, not on a node's innerHTML, otherwise strange
     * things happen with implicitly closed elements (see the Noscript test).
     */
    return html.replace(/<noscript[\s\S]+?<\/noscript>/gi, '')
  }


  ////////// EVENT LISTENERS //////////


  function mousedownListener(e) {
    if ($lastTouchTimestamp > (+new Date - 500)) {
      return // Otherwise, click doesn't fire
    }

    var a = getLinkTarget(e.target)

    if (!a || !isPreloadable(a)) {
      return
    }

    preload(a.href)
  }

  function mouseoverListener(e) {
    if ($lastTouchTimestamp > (+new Date - 500)) {
      return // Otherwise, click doesn't fire
    }

    var a = getLinkTarget(e.target)

    if (!a || !isPreloadable(a)) {
      return
    }

    a.addEventListener('mouseout', mouseoutListener)

    if (!$delayBeforePreload) {
      preload(a.href)
    }
    else {
      $urlToPreload = a.href
      $preloadTimer = setTimeout(preload, $delayBeforePreload)
    }
    getImageForLink(a);
  }

  function touchstartListener(e) {
    $lastTouchTimestamp = +new Date
    var a = getLinkTarget(e.target)

    if (!a || !isPreloadable(a)) {
      return
    }

    if ($preloadOnMousedown) {
      a.removeEventListener('mousedown', mousedownListener)
    }
    else {
      a.removeEventListener('mouseover', mouseoverListener)
    }
    preload(a.href);
    getImageForLink(a);
  }

  // If a link is focused, it is preloaded just like on mouseover.
  // It also covers the issue where a user needs to press <return>
  // twice in order to follow a focused link.
  function focusListener(e) {
    var a = getLinkTarget(e.target)

    if (!a || !isPreloadable(a)) {
      return
    }

    if (!$delayBeforePreload) {
      preload(a.href)
    }
    else {
      $urlToPreload = a.href
      $preloadTimer = setTimeout(preload, $delayBeforePreload)
    }
    getImageForLink(a);
  }

  function clickListener(e) {
    try{
      var a = getLinkTarget(e.target)

      if (!a || !isPreloadable(a)) {
        return
      }

      if (e.which > 1 || e.metaKey || e.ctrlKey) { // Opening in new tab
        return
      }
      display(a.href);
      e.preventDefault();
    }
    catch(err){
      console.log(err);
    }
  }

  function mouseoutListener() {
    if ($preloadTimer) {
      clearTimeout($preloadTimer)
      $preloadTimer = false
      return
    }

    if (!$isPreloading || $isWaitingForCompletion) {
      return
    }
    $xhr.abort()
    setPreloadingAsHalted()
  }

  function readystatechangeListener() {
    processXHR($xhr,$url);
  }

  function processXHR(xhr,url) {
    if (xhr.readyState < 4) {
      return
    }
    if (xhr.status == 0) {
      /* Request aborted */
      return
    }

    $timing.ready = +new Date - $timing.start
    var pageContentDiv = document.getElementById("page-content");
    if (pageContentDiv && xhr.status === 200 && xhr.getResponseHeader('Content-Type').match(/\/(x|ht|xht)ml/)) {
      var doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = removeNoscriptTags(xhr.responseText)
      var title = doc.title
      var body = doc.getElementById("page-content")
      var alteredOnReceive = triggerPageEvent('receive', url, body, title)
      if (alteredOnReceive) {
        if ('body' in alteredOnReceive) {
          body = alteredOnReceive.body
        }
        if ('title' in alteredOnReceive) {
          title = alteredOnReceive.title
        }
      }
      $fetchedBodies[url] = {body:body, title:title};
      var urlWithoutHash = removeHash(url)

      var elems = doc.head.children
        , found = 0
        , elem
        , data

      for (var i = 0; i < elems.length; i++) {
        elem = elems[i]
        if (elem.hasAttribute('data-instant-track')) {
          data = elem.getAttribute('href') || elem.getAttribute('src') || elem.innerHTML
          for (var j = 0; j < $trackedAssets.length; j++) {
            if ($trackedAssets[j] == data) {
              found++
            }
          }
        }
      }
      if (found != $trackedAssets.length) {
        $mustRedirect = true // Assets have changed
      }
    }
    else {
      $mustRedirect = true // Not an HTML document
    }

    if ($isWaitingForCompletion && $url === url) {
      $isWaitingForCompletion = false
      display($url)
    }
  }

  function popstateListener() {
    var loc = removeHash(location.href)
    if (loc == $currentLocationWithoutHash) {
      return
    }

    if (!(loc in $history)) {
      location.href = location.href
      return
    }
    $history[$currentLocationWithoutHash] = {
      body: document.getElementById("page-content"),
      title: document.title,
      scrollY: pageYOffset
    }

    $currentLocationWithoutHash = loc
    changePage($history[loc].title, $history[loc].body, false, $history[loc].scrollY, true)
  }


  ////////// MAIN FUNCTIONS //////////


  function instantanize(isInitializing) {
    var docBody = document.body;
    if (docBody) {
      document.body.addEventListener('touchstart', touchstartListener, true)
      document.body.addEventListener('focus', focusListener, true)
      if ($preloadOnMousedown) {
        document.body.addEventListener('mousedown', mousedownListener, true)
      } else {
        document.body.addEventListener('mouseover', mouseoverListener, true)
      }
      document.body.addEventListener('click', clickListener, true)
    }

    if (!isInitializing) {
      var scriptElementsInDOM = document.body.getElementsByTagName('script')
        , scriptElementsToCopy = []
        , originalElement
        , copyElement
        , parentNode
        , nextSibling
        , i

      // `scriptElementsInDOM` will change during the copy of scripts if
      // a script add or delete script elements, so we need to put script
      // elements in an array to loop through them correctly.
      for (i = 0; i < scriptElementsInDOM.length; i++) {
        scriptElementsToCopy.push(scriptElementsInDOM[i])
      }

      for (i = 0; i < scriptElementsToCopy.length; i++) {
        originalElement = scriptElementsToCopy[i]
        if (!originalElement) { // Might have disappeared, see previous comment
          continue
        }
        if (originalElement.hasAttribute('data-no-instant')) {
          continue
        }

        copyElement = document.createElement('script')
        for (var j = 0; j < originalElement.attributes.length; j++) {
          copyElement.setAttribute(originalElement.attributes[j].name, originalElement.attributes[j].value)
        }
        copyElement.textContent = originalElement.textContent

        parentNode = originalElement.parentNode
        nextSibling = originalElement.nextSibling
        parentNode.removeChild(originalElement)
        parentNode.insertBefore(copyElement, nextSibling)
      }
    }
  }

  function preload(url, option) {
    if (!$preloadOnMousedown
        && 'display' in $timing
        && +new Date - ($timing.start + $timing.display) < 100) {
      return
    }
    if ($preloadTimer) {
      clearTimeout($preloadTimer)
      $preloadTimer = false
    }

    if (!url) {
      url = $urlToPreload
    }

    if ($isPreloading && (url == $url || $isWaitingForCompletion)) {
      return
    }
    $isPreloading = true
    $isWaitingForCompletion = false

    $mustRedirect = false
    $timing = {
      start: +new Date
    }
    if (url.indexOf("?") == -1) {
      var internalUrl = url+"?i=i"
    }
    else {
      var internalUrl = url+"&i=i"
    }
    removeExpiredKeys()
    triggerPageEvent('fetch')
    if (!$fetchedBodies[url]){
      if (option === "force") {
        getURLInfo(url, function () {
          processXHR(this,url);
        })
      }
      else {
        $url = url
        $xhr.open('GET', internalUrl)
        $xhr.send()
      }
    }
  }

  function removeExpiredKeys(option) {
    if ( Object.keys($fetchedBodies).length > 13 || option == "force" ) {
      $fetchedBodies = {};
    }

  }

  function getURLInfo(url, callback) {
    var xhr = new XMLHttpRequest();
    if (url.indexOf("?") == -1) {
      var internalUrl = url+"?i=i"
    }
    else {
      var internalUrl = url+"&i=i"
    }
    xhr.open (
      "GET",
      internalUrl,
      true
    );
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        // defensive check
        if (typeof callback == "function") {
          // apply() sets the meaning of "this" in the callback
          callback.apply(xhr);
        }
      }
    }
    // send the request *after* the event handler is defined
    xhr.send();
  }

  function display(url) {
    $url = url;
    if($fetchedBodies[url]){
      var body = $fetchedBodies[url]['body'];
      var title = $fetchedBodies[url]['title'];
    }
    else {
      var prog = document.getElementById("navigation-progress");
      prog.classList.add("showing");
    }

    if (!('display' in $timing)) {
      $timing.display = +new Date - $timing.start
    }
    if ($preloadTimer || !$isPreloading) {
      if ($preloadTimer && $url && $url != url) {
        location.href = url
        return
      }
      preload(url)
      triggerPageEvent('wait')
      $isWaitingForCompletion = true // Must be set *after* calling `preload`
      return
    }
    if ($isWaitingForCompletion) {
      /* The user clicked on a link while a page was preloading. Either on
         the same link or on another link. If it's the same link something
         might have gone wrong (or he could have double clicked, we don't
         handle that case), so we send him to the page without pjax.
         If it's another link, it hasn't been preloaded, so we redirect the
         user to it.
      */
      location.href = url
      return
    }
    if ($mustRedirect) {
      location.href = $url
      return
    }

    if (!body) {
      triggerPageEvent('wait')
      $isWaitingForCompletion = true
      return
    }
    $history[$currentLocationWithoutHash] = {
      body: document.getElementById("page-content"),
      title: document.title,
      scrollY: pageYOffset
    }
    setPreloadingAsHalted()
    changePage(title, body, $url)
  }


  ////////// PUBLIC VARIABLE AND FUNCTIONS //////////

  var supported = 'pushState' in history
                  && (!$userAgent.match('Android') || $userAgent.match('Chrome/') || $userAgent.match('Firefox/'))
                  && location.protocol != "file:"

  /* The (sad) state of Android's AOSP browsers:

     2.3.7: pushState appears to work correctly, but
            `doc.documentElement.innerHTML = body` is buggy.
            Update: InstantClick doesn't use that anymore, but it may
            fail where 3.0 do, this needs testing again.

     3.0:   pushState appears to work correctly (though the address bar is
            only updated on focus), but
            `document.documentElement.replaceChild(doc.body, document.body)`
            throws DOMException: WRONG_DOCUMENT_ERR.

     4.0.2: Doesn't support pushState.

     4.0.4,
     4.1.1,
     4.2,
     4.3:   Claims support for pushState, but doesn't update the address bar.

     4.4:   Works correctly. Claims to be 'Chrome/30.0.0.0'.

     All androids tested with Android SDK's Emulator.
     Version numbers are from the browser's user agent.

     Because of this mess, the only allowed browser on Android is Chrome.
  */

  function init(preloadingMode) {
    if ($currentLocationWithoutHash) {
      /* Already initialized */
      return
    }
    if (!supported) {
      triggerPageEvent('change', true)
      return
    }

    if (preloadingMode == 'mousedown') {
      $preloadOnMousedown = true
    }
    else if (typeof preloadingMode == 'number') {
      $delayBeforePreload = preloadingMode
    }
    $currentLocationWithoutHash = removeHash(location.href)
    $history[$currentLocationWithoutHash] = {
      body: document.getElementById("page-content"),
      title: document.title,
      scrollY: pageYOffset
    }

    var elems = document.head.children
      , elem
      , data
    for (var i = 0; i < elems.length; i++) {
      elem = elems[i]
      if (elem.hasAttribute('data-instant-track')) {
        data = elem.getAttribute('href') || elem.getAttribute('src') || elem.innerHTML
        /* We can't use just `elem.href` and `elem.src` because we can't
           retrieve `href`s and `src`s from the Ajax response.
        */
        $trackedAssets.push(data)
      }
    }

    $xhr = new XMLHttpRequest()
    $xhr.addEventListener('readystatechange', readystatechangeListener)

    instantanize(true)

    triggerPageEvent('change', true)

    addEventListener('popstate', popstateListener)
    addRefreshBehavior();
  }

  function on(eventType, callback) {
    $eventsCallbacks[eventType].push(callback)
  }

  function addRefreshBehavior(){
    if (!("ontouchstart" in document.documentElement)) {
      return
    }

    var script = document.createElement('script');
    script.src = "https://dev.to/assets/lib/pulltorefresh-9b56f74a421b6273bdafaa34b17521df12711be7191050b1193dfd958a99a81a.js";
    document.head.appendChild(script);
    var waitingOnPTR = setInterval(function(){
      if (typeof PullToRefresh !== 'undefined') {
        var ptr = PullToRefresh.init({
          mainElement: 'body',
          passive: true,
          onRefresh: function(){
            window.location.reload();
            }
         });
         clearInterval(waitingOnPTR)
      }
    }, 1)
  }


  ////////////////////


  return {
    supported: supported,
    init: init,
    isPreloadable: isPreloadable,
    preload: preload,
    removeExpiredKeys: removeExpiredKeys,
    display: display,
    on: on
  }

}(document, location, navigator.userAgent);


// FUNCTIONAL CODE FOR PAGE

  function initializeBaseApp() {
    InstantClick.on('change', function() {
      initializePage();
    });
    InstantClick.init();
  }

// INITIALIZE/ERROR HANDLING

  Honeybadger.configure({
    apiKey: document.body.dataset.honeybadgerKey,
    environment: "production",
    revision: document.body.dataset.releaseFootprint,
  });

  Honeybadger.beforeNotify(function(notice) {
    const ignorePatterns = [/ResizeObserver/i, /MetaMask/i, /MtPopUpList/i]
    return !(ignorePatterns.some((pattern) => pattern.test(notice.message)));
  });

// INITIALIZE AHOY TRACKING
// Setting cookies to false matches what we do in ahoy's initializer.
// Setting trackVisits to false prevents ahoy from creating a visit on the server-side.
  ahoy.configure({
    cookies: false,
    trackVisits: false
  });

// Start BaseApp for Page
  initializeBaseApp();
