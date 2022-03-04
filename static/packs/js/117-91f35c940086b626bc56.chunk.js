(window.webpackJsonp = window.webpackJsonp || []).push([
    [117], {
        10: function(e, t, n) {
            "use strict";
            n.d(t, "a", (function() { return a })), n.d(t, "b", (function() { return s }));
            var r = n(9),
                o = n(11);

            function i(e, t) {
                var n = "undefined" !== typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
                if (!n) {
                    if (Array.isArray(e) || (n = function(e, t) { if (!e) return; if ("string" === typeof e) return c(e, t); var n = Object.prototype.toString.call(e).slice(8, -1); "Object" === n && e.constructor && (n = e.constructor.name); if ("Map" === n || "Set" === n) return Array.from(e); if ("Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return c(e, t) }(e)) || t && e && "number" === typeof e.length) {
                        n && (e = n);
                        var r = 0,
                            o = function() {};
                        return { s: o, n: function() { return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] } }, e: function(e) { throw e }, f: o }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var i, a = !0,
                    l = !1;
                return { s: function() { n = n.call(e) }, n: function() { var e = n.next(); return a = e.done, e }, e: function(e) { l = !0, i = e }, f: function() { try { a || null == n.return || n.return() } finally { if (l) throw i } } }
            }

            function c(e, t) {
                (null == t || t > e.length) && (t = e.length);
                for (var n = 0, r = new Array(t); n < t; n++) r[n] = e[n];
                return r
            }
            var a = function() { return Object(o.a)(l) },
                l = function() {
                    var e, t = i(document.querySelectorAll("[data-repositioning-dropdown]"));
                    try {
                        for (t.s(); !(e = t.n()).done;) {
                            var n = e.value;
                            n.classList.remove("reverse");
                            var o = "block" === n.style.display;
                            o || (n.style.opacity = 0, n.style.display = "block"), Object(r.a)({ element: n }) || n.classList.add("reverse"), o || (n.style.removeProperty("display"), n.style.removeProperty("opacity"))
                        }
                    } catch (c) { t.e(c) } finally { t.f() }
                },
                u = 'button, [href], input:not([type="hidden"]), select, textarea, [tabindex="0"]',
                d = function(e) {
                    var t, n = e.triggerElementId,
                        r = e.dropdownContentId,
                        o = e.onClose,
                        i = document.getElementById(r);
                    i && (null === (t = document.getElementById(n)) || void 0 === t || t.setAttribute("aria-expanded", "false"), i.style.removeProperty("display"), null === o || void 0 === o || o())
                },
                s = function(e) {
                    var t = e.triggerElementId,
                        n = e.dropdownContentId,
                        r = e.dropdownContentCloseButtonId,
                        o = e.onClose,
                        i = e.onOpen,
                        c = document.getElementById(t),
                        a = document.getElementById(n);
                    if (c && a) {
                        c.setAttribute("aria-expanded", "false"), c.setAttribute("aria-controls", n), c.setAttribute("aria-haspopup", "true");
                        var l, s = function(e) {
                                var r = e.key;
                                if ("Escape" === r) "true" === c.getAttribute("aria-expanded") && (d({ triggerElementId: t, dropdownContentId: n, onClose: v }), c.focus());
                                else if ("Tab" === r) {
                                    (null === a || void 0 === a ? void 0 : a.contains(document.activeElement)) || d({ triggerElementId: t, dropdownContentId: n, onClose: v })
                                }
                            },
                            f = function(e) {
                                var r = e.target;
                                r === c || a.contains(r) || c.contains(r) || (d({ triggerElementId: t, dropdownContentId: n, onClose: v }), r.matches(u) || c.focus())
                            },
                            v = function() { null === o || void 0 === o || o(), document.removeEventListener("keyup", s), document.removeEventListener("click", f) };
                        if (c.addEventListener("click", (function() {
                                var e;
                                "true" === (null === (e = document.getElementById(t)) || void 0 === e ? void 0 : e.getAttribute("aria-expanded")) ? d({ triggerElementId: t, dropdownContentId: n, onClose: v }): (! function(e) {
                                    var t, n = e.triggerElementId,
                                        r = e.dropdownContentId,
                                        o = document.getElementById(r);
                                    document.getElementById(n).setAttribute("aria-expanded", "true"), o.style.display = "block", null === (t = o.querySelector(u)) || void 0 === t || t.focus()
                                }({ triggerElementId: t, dropdownContentId: n }), null === i || void 0 === i || i(), document.addEventListener("keyup", s), document.addEventListener("click", f))
                            })), r) null === (l = document.getElementById(r)) || void 0 === l || l.addEventListener("click", (function() {
                            var e;
                            d({ triggerElementId: t, dropdownContentId: n, onClose: v }), null === (e = document.getElementById(t)) || void 0 === e || e.focus()
                        }));
                        return { closeDropdown: function() { d({ triggerElementId: t, dropdownContentId: n, onClose: v }) } }
                    }
                }
        },
        11: function(e, t, n) {
            "use strict";
            n.d(t, "a", (function() { return l }));
            var r = n(12),
                o = n.n(r);

            function i(e, t) {
                var n = Object.keys(e);
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e);
                    t && (r = r.filter((function(t) { return Object.getOwnPropertyDescriptor(e, t).enumerable }))), n.push.apply(n, r)
                }
                return n
            }

            function c(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {};
                    t % 2 ? i(Object(n), !0).forEach((function(t) { a(e, t, n[t]) })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : i(Object(n)).forEach((function(t) { Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t)) }))
                }
                return e
            }

            function a(e, t, n) { return t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n, e }

            function l(e) {
                var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                    n = t.time,
                    r = void 0 === n ? 300 : n,
                    i = t.config,
                    a = void 0 === i ? { leading: !1 } : i,
                    l = c({}, a);
                return o()(e, r, l)
            }
        },
        139: function(e, t, n) {
            "use strict";
            n.r(t), n.d(t, "listenForHoveredOrFocusedStoryCards", (function() { return y })), n.d(t, "initializeFeedPreviewCards", (function() { return b }));
            var r = n(0),
                o = n(4),
                i = Object(o.g)((function(e) {
                    var t = e.email,
                        n = e.location,
                        o = e.summary,
                        i = e.created_at,
                        c = e.education,
                        a = e.work,
                        l = new Date(i),
                        u = new Intl.DateTimeFormat(navigator.language || "default", { day: "numeric", month: "long", year: "numeric" }).format(l);
                    return Object(r.h)(r.Fragment, null, o && Object(r.h)("div", { className: "color-base-70" }, o), Object(r.h)("div", { className: "user-metadata-details" }, Object(r.h)("ul", { class: "user-metadata-details-inner" }, t && Object(r.h)("li", null, Object(r.h)("div", { class: "key" }, "Email"), Object(r.h)("div", { class: "value" }, Object(r.h)("a", { href: "mailto:".concat(t) }, t))), a && Object(r.h)("li", null, Object(r.h)("div", { className: "key" }, "Work"), Object(r.h)("div", { className: "value" }, a)), n && Object(r.h)("li", null, Object(r.h)("div", { class: "key" }, "Location"), Object(r.h)("div", { class: "value" }, n)), c && Object(r.h)("li", null, Object(r.h)("div", { class: "key" }, "Education"), Object(r.h)("div", { class: "value" }, c)), Object(r.h)("li", null, Object(r.h)("div", { class: "key" }, "Joined"), Object(r.h)("div", { class: "value" }, Object(r.h)("time", { datetime: i, class: "date" }, u))))))
                })),
                c = n(10),
                a = n(17);

            function l(e, t) {
                var n = "undefined" !== typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
                if (!n) {
                    if (Array.isArray(e) || (n = function(e, t) { if (!e) return; if ("string" === typeof e) return u(e, t); var n = Object.prototype.toString.call(e).slice(8, -1); "Object" === n && e.constructor && (n = e.constructor.name); if ("Map" === n || "Set" === n) return Array.from(e); if ("Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return u(e, t) }(e)) || t && e && "number" === typeof e.length) {
                        n && (e = n);
                        var r = 0,
                            o = function() {};
                        return { s: o, n: function() { return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] } }, e: function(e) { throw e }, f: o }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var i, c = !0,
                    a = !1;
                return { s: function() { n = n.call(e) }, n: function() { var e = n.next(); return c = e.done, e }, e: function(e) { a = !0, i = e }, f: function() { try { c || null == n.return || n.return() } finally { if (a) throw i } } }
            }

            function u(e, t) {
                (null == t || t > e.length) && (t = e.length);
                for (var n = 0, r = new Array(t); n < t; n++) r[n] = e[n];
                return r
            }

            function d(e, t, n, r, o, i, c) {
                try {
                    var a = e[i](c),
                        l = a.value
                } catch (u) { return void n(u) }
                a.done ? t(l) : Promise.resolve(l).then(r, o)
            }

            function s(e) {
                return function() {
                    var t = this,
                        n = arguments;
                    return new Promise((function(r, o) {
                        var i = e.apply(t, n);

                        function c(e) { d(i, r, o, c, a, "next", e) }

                        function a(e) { d(i, r, o, c, a, "throw", e) }
                        c(void 0)
                    }))
                }
            }
            var f = {};

            function v() {
                return (v = s((function*(e) {
                    var t = e.dataset,
                        n = t.authorId;
                    if (!t.fetched) {
                        e.dataset.fetched = "true";
                        var r = f[n];
                        if (r) m(r, e);
                        else {
                            var o = yield Object(a.a)("/profile_preview_cards/".concat(n)),
                                i = yield o.json();
                            f[n] = i, m(i, e)
                        }
                    }
                }))).apply(this, arguments)
            }

            function m(e, t) {
                var n = t.parentElement;
                Object(r.render)(Object(r.h)(i, e), n, t), n.closest(".profile-preview-card__content").style.setProperty("--card-color", e.card_color)
            }

            function p(e) {
                var t = e.target;
                if (t.classList.contains("profile-preview-card__trigger")) {
                    var n = t.parentElement.getElementsByClassName("author-preview-metadata-container")[0];
                    n && function(e) { v.apply(this, arguments) }(n)
                }
            }

            function y() {
                var e = document.getElementById("main-content");
                e.addEventListener("mouseover", p), e.addEventListener("focusin", p)
            }

            function b() {
                var e, t = l(document.querySelectorAll("button[id^=story-author-preview-trigger]:not([data-initialized])"));
                try {
                    var n = function() {
                        var t = e.value,
                            n = t.getAttribute("aria-controls"),
                            r = document.getElementById(n);
                        r && (Object(c.b)({ triggerElementId: t.id, dropdownContentId: n, onOpen: function() { return null === r || void 0 === r ? void 0 : r.classList.add("showing") }, onClose: function() { return null === r || void 0 === r ? void 0 : r.classList.remove("showing") } }), t.dataset.initialized = !0)
                    };
                    for (t.s(); !(e = t.n()).done;) n()
                } catch (r) { t.e(r) } finally { t.f() }
            }
            var g = new MutationObserver((function(e) { e.forEach((function(e) { "childList" === e.type && b() })) }));
            document.getElementById("index-container") && g.observe(document.getElementById("index-container"), { childList: !0, subtree: !0 });
            var h = Object(c.a)();
            document.addEventListener("scroll", h), InstantClick.on("change", (function() { g.disconnect(), document.removeEventListener("scroll", h) })), window.addEventListener("beforeunload", (function() { g.disconnect(), document.removeEventListener("scroll", h) }))
        },
        17: function(e, t, n) {
            "use strict";
            n.d(t, "a", (function() { return d }));
            var r = ["headers", "body", "method", "csrfToken"];

            function o(e, t) {
                var n = Object.keys(e);
                if (Object.getOwnPropertySymbols) {
                    var r = Object.getOwnPropertySymbols(e);
                    t && (r = r.filter((function(t) { return Object.getOwnPropertyDescriptor(e, t).enumerable }))), n.push.apply(n, r)
                }
                return n
            }

            function i(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var n = null != arguments[t] ? arguments[t] : {};
                    t % 2 ? o(Object(n), !0).forEach((function(t) { c(e, t, n[t]) })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : o(Object(n)).forEach((function(t) { Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t)) }))
                }
                return e
            }

            function c(e, t, n) { return t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n, e }

            function a(e, t) {
                if (null == e) return {};
                var n, r, o = function(e, t) {
                    if (null == e) return {};
                    var n, r, o = {},
                        i = Object.keys(e);
                    for (r = 0; r < i.length; r++) n = i[r], t.indexOf(n) >= 0 || (o[n] = e[n]);
                    return o
                }(e, t);
                if (Object.getOwnPropertySymbols) { var i = Object.getOwnPropertySymbols(e); for (r = 0; r < i.length; r++) n = i[r], t.indexOf(n) >= 0 || Object.prototype.propertyIsEnumerable.call(e, n) && (o[n] = e[n]) }
                return o
            }

            function l(e, t, n, r, o, i, c) {
                try {
                    var a = e[i](c),
                        l = a.value
                } catch (u) { return void n(u) }
                a.done ? t(l) : Promise.resolve(l).then(r, o)
            }

            function u(e) {
                return function() {
                    var t = this,
                        n = arguments;
                    return new Promise((function(r, o) {
                        var i = e.apply(t, n);

                        function c(e) { l(i, r, o, c, a, "next", e) }

                        function a(e) { l(i, r, o, c, a, "throw", e) }
                        c(void 0)
                    }))
                }
            }

            function d(e) { return s.apply(this, arguments) }

            function s() {
                return s = u((function*(e) {
                    var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                        n = t.headers,
                        o = t.body,
                        c = t.method,
                        l = void 0 === c ? "GET" : c,
                        u = t.csrfToken,
                        d = void 0 === u ? yield getCsrfToken() : u,
                        s = a(t, r),
                        f = { body: o && "string" !== typeof o ? JSON.stringify(o) : o },
                        v = i(i({ method: l, headers: i({ Accept: "application/json", "X-CSRF-Token": d, "Content-Type": "application/json" }, n), credentials: "same-origin" }, f), s);
                    return fetch(e, v)
                })), s.apply(this, arguments)
            }
        },
        9: function(e, t, n) {
            "use strict";

            function r(e) {
                var t = e.element,
                    n = e.offsetTop,
                    r = void 0 === n ? 0 : n,
                    o = e.allowPartialVisibility,
                    i = void 0 !== o && o,
                    c = t.getBoundingClientRect(),
                    a = window.innerHeight || document.documentElement.clientHeight,
                    l = window.innerWidth || document.documentElement.clientWidth,
                    u = c.top <= a && c.top >= r,
                    d = c.right >= 0 && c.right <= l,
                    s = c.bottom >= r && c.bottom <= a,
                    f = c.left <= l && c.left >= 0,
                    v = c.top <= r,
                    m = c.bottom >= a;
                return i ? (u || s || v && m) && (f || d) : u && s && f && d
            }
            n.d(t, "a", (function() { return r }))
        }
    }
]);
//# sourceMappingURL=117-91f35c940086b626bc56.chunk.js.map