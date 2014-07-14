/**
 * @license GNU General Public License v2 http://www.gnu.org/licenses/gpl-2.0
 * @author BlueMöhre <bluemoehre@gmx.de>
 * @copyright 2013 BlueMöhre
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
     * @type {{hashPrefix: string, clipOffset: (number|string), hopOffset: (number|string)}}
     */
    var opts = {
        /**
         * Defines a prefix which must be present for using animation by this plugin.
         * If no prefix is given, jumping to all anchors will be animated.
         * (This is only for the address bar and links. Please do NOT add this to your target IDs.)
         */
        hashPrefix: 'jump:',
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
        hopOffset: '15%',
        animSpeed: 750
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
        var offset = $(el).offset().top - calcClipOffset();
        return offset > 0 ? offset : 0;
    }

    /**
     * Scrolls to the given target
     * - If doHop is true, we will skip some part of the scrolling to save some time using the opts.hopOffset
     * @param {(number|string|HTMLElement|jQuery)} target
     * @param {boolean} [doHop]
     */
    function scrollTo(target, doHop){
        var hopOffset;
        var elOffset;
        var diffOffset;

        if (typeof target === 'number'){
            elOffset = target;
        }
        // if there is an element with the given anchor ID calculate its offset
        // else test for special target
        else if (typeof target === 'string'){
            if (opts.hashPrefix && target.indexOf('#' + opts.hashPrefix) == 0){
                var el = doc.getElementById(target.replace('#' + opts.hashPrefix, ''));
                if (!el) return;
                elOffset = calcTargetOffset(el);
            } else if (target == '#top'){
                elOffset = 0;
            } else if (target == '#bottom'){
                elOffset = $doc.height();
            } else {
                return;
            }
        } else {
            elOffset = calcTargetOffset(target);
        }

        if (elOffset !== undefined && elOffset !== null){
            hopOffset = calcHopOffset();
            diffOffset = elOffset - $win.scrollTop();

            // do hopping only if wanted and necessary
            if (doHop && hopOffset < Math.abs(diffOffset)){
                // care about the target might be above current visible page part
                if (diffOffset > 0){
                    $viewport.scrollTop(elOffset - hopOffset);
                } else {
                    $viewport.scrollTop(elOffset + hopOffset);
                }
            }

            $viewport.stop(true).animate({
                scrollTop: elOffset
            }, opts.animSpeed);
        }
    }

    // if the location hash contains valid jump mark when document is ready scroll to it
    $(function(){
        $viewport = $('html, body');
        if (win.location.hash.indexOf('#' + opts.hashPrefix) == 0){
            scrollTo(win.location.hash, true);
        }
    });

    // automatically handle all clicks on links with hashes/jump marks
    $doc.on('click.' + PLUGIN_NAME, 'a', function(evt){
        if (this.hash.indexOf('#' + opts.hashPrefix) == 0 && !evt.isDefaultPrevented()){
            evt.preventDefault();
            var stateObj = win.history.state || {};

            // save current state
            if (!win.location.hash){
                stateObj[PLUGIN_NAME] = $win.scrollTop();
                win.history.replaceState(stateObj);
            }

            stateObj[PLUGIN_NAME] = this.hash;
            win.history.pushState(stateObj, null, this.href);
            scrollTo(this.hash, false);
        }
    });

    // automatically handle history navigation
    $win.on('popstate.' + PLUGIN_NAME, function(evt){
        if(evt.originalEvent.state && evt.originalEvent.state[PLUGIN_NAME] !== undefined){
            // prevent native scrolling - atm no effect =/
            evt.preventDefault();
            scrollTo(evt.originalEvent.state[PLUGIN_NAME], false);
            ignoreHashChangeEvent = true;
            setTimeout(function(){
                ignoreHashChangeEvent = false;
            }, opts.animSpeed);
        }
    });

    // automatically handle hash change by user or JavaScript
    $win.on('hashchange.' + PLUGIN_NAME, function(evt){
        if (win.location.hash.indexOf('#' + opts.hashPrefix) == 0 && !ignoreHashChangeEvent){
            evt.preventDefault();
            var stateObj = {};
            stateObj[PLUGIN_NAME] = win.location.hash;
            win.history.replaceState(stateObj);
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
            $.error('parameter must be String, HTMLElement, jQuery or configuration Object');
        }
    };

})(jQuery, window, document);
