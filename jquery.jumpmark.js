/**
 * @license GNU General Public License v2 http://www.gnu.org/licenses/gpl-2.0
 * @author BlueMöhre <bluemoehre@gmx.de>
 * @copyright 2015 BlueMöhre
 * @link http://www.github.com/bluemoehre
 */
(function($, win, doc) {

    'use strict';

    /**
     * The plugin name and event namespace
     * @type {string}
     */
    var PLUGIN_NAME = 'jumpmark';

    /**
     * The plugin options
     * @type {{actionPrefix: string, hashPrefix: string, clipOffset: (number|string), hopOffset: (number|string), disablePopstateAnim: boolean}}
     */
    var opts = {
        /**
         * Defines a prefix which must be present only on links but not the targets for using animation by this plugin.
         * This prefix is only used to detect if the current hash should be handled with this plugin.
         * If no prefix is given some jumps maybe cannot be animated due to browser restrictions.
         */
        actionPrefix: '!jump:',
        /**
         * Defines a prefix which must be present on links and targets for using animation by this plugin.
         * This prefix behaves like a filter to detect if the current hash should be handled with this plugin.
         * If no prefix is given (default), jumping to all anchors will be animated.
         */
        hashPrefix: '',
        /**
         * Defines a general offset between the target element and the viewport's top
         * - A number will be treated as pixels. You may add '%' to use a relative offset related to the viewport.
         * - If set to zero the target element will clip at the top of the viewport (if possible)
         * - If set higher than zero the there will be some distance between viewport's top and the element (more natural)
         */
        clipOffset: '15%',
        /**
         * If a jump mark was present on page load, hop right before the target and start scrolling animation from there.
         * That prevents scrolling over the whole document, which might be quite annoying to the user.
         * - A number will be treated as pixels. You may add '%' to use a relative offset related to the viewport.
         * - If this is zero no animation will happen
         */
        hopOffset: '25%',
        /**
         * Animation duration in milliseconds
         */
        animSpeed: 750,
        /**
         * Disable animation for popstate events (which will cause flicker because the event is not canceable)
         */
        disablePopstateAnim: false
    };

    /**
     * Easings used by this plugin
     * @type {{easeInOutQuad: Function}}
     */
    var easings = {
        easeInOutQuad: function (x, t, b, c, d) {
            return (t/=d/2) < 1  ?  c/2*t*t + b  :  -c/2 * ((--t)*(t-2) - 1) + b;
        },
        easeOutQuad: function (x, t, b, c, d) {
            return -c *(t/=d)*(t-2) + b;
        }
    };

    /**
     * Holds the jQuery object of the scrollable container
     * Due to differences in Mozilla and Webkit this must be html & body
     * ATTENTION! Maybe at this point of execution the DOM contains no BODY, so select it with the READY-Event later
     * @type {?jQuery}
     */
    var $viewport = null;

    /**
     * @type {jQuery}
     */
    var $win = $(win);

    /**
     * @type {jQuery}
     */
    var $doc = $(doc);

    /**
     * @type {boolean}
     */
    var ignoreHashChangeEvent = false;


    /**
     * Tests if the given hash should be handled by this plugin
     * @param {string} hash
     * @returns {boolean}
     */
    function isJumpmark(hash){
        return (hash.indexOf('#' + opts.actionPrefix + opts.hashPrefix) == 0);
    }

    /**
     * Returns TRUE for a relative clip offset and FALSE for an absolute value
     * @type {boolean}
     */
    function isClipOffsetRelative(){
        return opts.clipOffset.substr(-1) == '%';
    }

    /**
     * Returns TRUE for a relative hop offset and FALSE for an absolute value
     * @type {boolean}
     */
    function isHopOffsetRelative(){
        return opts.hopOffset.substr(-1) == '%';
    }

    /**
     * Returns the hop offset in pixels respecting the current viewport height
     * @returns {number}
     */
    function calcHopOffset(){
        return isHopOffsetRelative() ? $win.height()/100*parseInt(opts.hopOffset) : parseInt(opts.hopOffset);
    }

    /**
     * Returns the clip offset in pixels respecting the current viewport height
     * @returns {number}
     */
    function calcClipOffset(){
        return isClipOffsetRelative() ? $win.height()/100*parseInt(opts.clipOffset) : parseInt(opts.clipOffset);
    }

    /**
     * Returns elements top offset in pixels respecting the clip offset
     * @param {(HTMLElement|jQuery)} el
     * @returns {number}
     */
    function calcTargetOffset(el){
        var offset = Math.min($(el).offset().top - calcClipOffset(), doc.documentElement.scrollHeight - doc.documentElement.clientHeight);
        return offset > 0 ? offset : 0;
    }

    /**
     * Returns the target element for a hash or NULL.
     * @param {string} hash
     * @returns {HTMLElement|null}
     */
    function getTargetElement(hash){
        return doc.getElementById(hash.substr(1 + opts.actionPrefix.length));
    }

    /**
     * Scrolls to the given target
     * Target can be a pixel offset, jumpmark hash or HTML-Element.
     * If doHop is true, we will skip some part of the scrolling to save some time using the "opts.hopOffset".
     * @param {(number|string|HTMLElement|jQuery)} target
     * @param {boolean} [doHop]
     */
    function scrollTo(target, doHop){
        var animEase = 'easeInOutQuad';
        var hopOffset;
        var elOffset;
        var diffOffset;

        // if scroll offset
        if (typeof target === 'number'){
            elOffset = target;
        }
        // if there is an element with the given anchor ID calculate its offset else test for special target (top/bottom)
        else if (typeof target === 'string' && isJumpmark(target)){
            target = getTargetElement(target) || target.substr(('#' + opts.actionPrefix + opts.hashPrefix).length);
            if (typeof target === 'object'){
                elOffset = calcTargetOffset(target);
            } else if (target === '_top'){
                elOffset = 0;
            } else if (target === '_bottom'){
                elOffset = doc.documentElement.scrollHeight - doc.documentElement.clientHeight;
            }
        }
        // if HTML-Element
        else if (typeof target === 'object') {
            elOffset = calcTargetOffset(target);
        }

        if (elOffset !== undefined && elOffset !== null){
            hopOffset = calcHopOffset();
            diffOffset = elOffset - $win.scrollTop();

            // do hopping only if wanted and necessary
            if (doHop && hopOffset < Math.abs(diffOffset)){
                // take care about that the target might be above current visible page part
                if (diffOffset > 0){
                    $viewport.scrollTop(elOffset - hopOffset);
                } else {
                    $viewport.scrollTop(elOffset + hopOffset);
                }
                animEase = 'easeOutQuad';
            }

            $viewport.stop(true).animate({
                scrollTop: elOffset
            }, opts.animSpeed, animEase);
        }
    }

    // extend jQuery with our own easing functions
    if (!$.easing.easeInOutQuad){
        $.extend($.easing, easings);
    }

    // if the location hash contains valid jump mark when document is ready scroll to it
    $(function(){
        $viewport = $('html, body');
        if (isJumpmark(win.location.hash)){
            scrollTo(win.location.hash, true);
        }
    });

    // automatically handle all clicks on links with hashes/jump marks
    $doc.on('click.' + PLUGIN_NAME, 'a', function(evt){
        var stateObj;
        if (
            // if no event listener prevented the default while event bubbled up to the document
            !evt.isDefaultPrevented()
            // if prefix matches
            && isJumpmark(this.hash)
            // if link points to same page
            && this.href.split('#')[0] == window.location.href.split('#')[0]
            // if target element exists
            && (
                getTargetElement(this.hash)
                || this.hash.substr(-4) === '_top'
                || this.hash.substr(-7) === '_bottom'
            )
        ) {
            evt.preventDefault();

            // save current state if no hash is present to return to make it possible to return to here
            if (!win.location.hash){
                stateObj = win.history.state || {};
                stateObj[PLUGIN_NAME] = $win.scrollTop();
                win.history.replaceState(stateObj, '', win.location.href);
            }

            if (window.location.hash != this.hash) {
                stateObj = {};
                stateObj[PLUGIN_NAME] = this.hash;
                win.history.pushState(stateObj, '', this.href);
            }
            scrollTo(this.hash, false);
        }
    });

    // automatically handle history navigation
    $win.on('popstate.' + PLUGIN_NAME, function(evt){
        if (evt.originalEvent && evt.originalEvent.state && evt.originalEvent.state[PLUGIN_NAME] !== undefined){
            if (!opts.disablePopstateAnim) {
                // prevent native scrolling
                evt.preventDefault();
                win.history.scrollRestoration = 'manual';
                
                scrollTo(evt.originalEvent.state[PLUGIN_NAME], false);
            }

            // prevent the hashchange event which is fired right after this popstate event
            ignoreHashChangeEvent = true;
            setTimeout(function(){
                ignoreHashChangeEvent = false;
            }, 10);
        }
    });

    // automatically handle hash change by user or JavaScript
    $win.on('hashchange.' + PLUGIN_NAME, function(evt){
        if (
            !evt.isDefaultPrevented()
            // if event is not related to popstate
            && !ignoreHashChangeEvent
            // if prefix matches
            && isJumpmark(win.location.hash)
            // if target element exists
            && (
                getTargetElement(win.location.hash)
                || win.location.hash.substr(-4) === '_top'
                || win.location.hash.substr(-7) === '_bottom'
            )
        ) {
            evt.preventDefault();
            var stateObj = {};
            stateObj[PLUGIN_NAME] = win.location.hash;
            win.history.replaceState(stateObj, '', win.location.href);
            scrollTo(win.location.hash, false);
        }
    });

    // abort animation on user scroll
    $win.on('DOMMouseScroll.' + PLUGIN_NAME +' mousewheel.' + PLUGIN_NAME, function(){
        $viewport.stop(true);
    });

    // register plugin to jQuery so the options are changeable
    $[PLUGIN_NAME] = function(arg){
        if (typeof arg === 'string' || arg instanceof jQuery || arg instanceof HTMLElement){
            scrollTo(arg);
        } else if (typeof arg === 'object' && arg.toString() == '[object Object]'){
            opts = $.extend(opts, arg);
        } else  {
            $.error('Parameter must be String, HTMLElement, jQuery or configuration Object');
        }
    };

})(jQuery, window, document);
