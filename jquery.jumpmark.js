/**
 * @license GNU General Public License v2 http://www.gnu.org/licenses/gpl-2.0
 * @author BlueMöhre <bluemoehre@gmx.de>
 * @copyright 2013 BlueMöhre
 * @link http://www.github.com/bluemoehre
 */

// use window as local variable due to performance improvement
(function($, win, doc) {

    'use strict';

    /**
     * The plugin name and data-attribute name/selector
     * @type {string}
     */
    var PLUGIN_NAME = 'jumpmark';

    /**
     * @type {string}
     */
    var ANCHOR_PREFIX = 'jump:';

    /**
     * Defines a general offset between the target element and the viewport's top
     * - If set to zero the target element will clip at the top of the viewport (if possible)
     * - If set higher than zero the there will be some distance between viewport's top and element (more natural)
     * - You may add '%' to use a relative offset related to the viewport else it will be treated as pixels
     * @type {(number|string)}
     */
    var CLIP_OFFSET = '15%';

    /**
     * Is TRUE for a relative clip offset and FALSE for an absolute value
     * @type {boolean}
     */
    var CLIP_OFFSET_RELATIVE = CLIP_OFFSET.substr(-1) == '%';

    /**
     * If a jump mark was present on page load this value is used to hop right before the jump mark and start animation there.
     * So we wont scroll over the whole document which might be quite annoying to the user.
     * - If this is zero no animation will happen
     * - You may add '%' to use a relative offset related to the viewport else it will be treated as pixels
     * @type {(number|string)}
     */
    var HOP_OFFSET = '10%';

    /**
     * Is TRUE for a relative hop offset and FALSE for an absolute value
     * @type {boolean}
     */
    var HOP_OFFSET_RELATIVE = HOP_OFFSET.substr(-1) == '%';

    /**
     * Holds the jQuery object of the scrollable container
     * Due to differences in Mozilla and Webkit this must be html & body
     * ATTENTION! Maybe at this point of execution the DOM contains no BODY, so select it with the READY-Event later
     * @type {(jQuery|null)}
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
     * Returns the hop offset respecting the current viewport height
     */
    var calcHopOffset = function(){
        return HOP_OFFSET_RELATIVE ? $win.height()/100*parseInt(HOP_OFFSET) : parseInt(HOP_OFFSET);
    };

    /**
     * Returns the clip offset respecting the current viewport height
     */
    var calcClipOffset = function(){
        return CLIP_OFFSET_RELATIVE ? $win.height()/100*parseInt(CLIP_OFFSET) : parseInt(CLIP_OFFSET);
    };

    /**
     * Returns elements top offset respecting the clip offset
     * @param {Object} el
     */
    var calcOffset = function(el){
        var offset = $(el).offset().top - calcClipOffset();
        return offset > 0 ? offset : 0;
    };

    /**
     * Scrolls to the given target
     * - If hop is true, we will skip some part of the scrolling to save some time
     * @param {(number|string)} target
     * @param {boolean} [hop]
     */
    var scrollTo = function(target, hop){
        var hopOffset = calcHopOffset();
        var el;
        var offset;
        var distance;

        // if given argument was a number
        if (typeof target === 'number'){
            offset = target;
        }
        // if given argument was a valid anchor ID
        else if (target.match(new RegExp('^' + ANCHOR_PREFIX))) {
            el = doc.getElementById(target);

            // if there is an element with the given anchor ID calculate its offset
            if (el){
                offset = calcOffset(el);
            }
            // if there is no element with the given anchor ID but the anchor was page-top, simply set offset to zero
            else if (target == ANCHOR_PREFIX +'_top'){
                offset = 0;
            }
        }

        // scroll to offset
        if (typeof offset !== 'undefined'){
            distance = offset - $viewport.scrollTop();
            // do hopping only if wanted and necessary
            if (hop && hopOffset < Math.abs(distance)){
                // care about the  target might be above current visible page part
                win.scrollTo(win.pageXOffset, offset - (hopOffset * (distance > 0 ? 1 : -1)));
            }
            $viewport.stop(true).animate({
                scrollTop: offset
            });
        }
    };

    // on document ready select the viewport
    // if the location hash contains valid jump mark and scroll there
    $(function(){
        $viewport = $('html, body');
        if (win.location.hash.match(new RegExp('^#\\!?'+ ANCHOR_PREFIX))){
            scrollTo(win.location.hash.replace(/#!?/,''), true);
        }
    });

    // automatically handle all clicks on jump marks
    $doc.on('click.' + PLUGIN_NAME, 'a[href^="#'+ ANCHOR_PREFIX +'"]', function(evt){
        evt.preventDefault();
        var stateObj = win.history.state || {};
        if (!win.location.hash){
            stateObj[PLUGIN_NAME + 'Target'] = $win.scrollTop();
            win.history.replaceState(stateObj);
        }
        stateObj = {};
        stateObj[PLUGIN_NAME + 'Target'] = this.hash.slice(1);
        // add exclamation mark as little hack to prevent tha browsers native scrolling on popstate
        win.history.pushState(stateObj, null, this.hash.replace('#','#!'));
        scrollTo(stateObj[PLUGIN_NAME + 'Target'], false);
    });

    // automatically handle history navigation
    $win.on('popstate.' + PLUGIN_NAME, function(evt){
        if(evt.originalEvent.state && PLUGIN_NAME + 'Target' in evt.originalEvent.state){
            scrollTo(evt.originalEvent.state[PLUGIN_NAME + 'Target'], false);
        }
    });

    // automatically handle hash change by user or JavaScript
    $win.on('hashchange', function(){
        if (win.location.hash.match(new RegExp('^#\\!?'+ ANCHOR_PREFIX))){
            scrollTo(win.location.hash.replace(/#!?/,''), false);
        }
    });

})(jQuery, window, document);
