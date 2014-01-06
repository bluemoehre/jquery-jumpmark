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
    var CLIP_OFFSET = '20%';
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
     * @param {Object} el
     */
    var calcHopOffset = function(){
        return HOP_OFFSET_RELATIVE ? $win.height()/100*parseInt(HOP_OFFSET) : parseInt(HOP_OFFSET);
    };

    /**
     * Returns the clip offset respecting the current viewport height
     * @param {Object} el
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
     * @param {string} targetId
     * @param {boolean} [hop]
     */
    var scrollTo = function(targetId, hop){
        try {
            targetId = targetId.match(new RegExp(ANCHOR_PREFIX +'[\\w\\d_-]+'))[0];
            var el = doc.getElementById(targetId);
            var hopOffset = calcHopOffset();
            // scroll to element
            if (el){
                var offset = calcOffset(el);
                var distance = offset - $viewport.scrollTop();
                // do hopping only if wanted and necessary
                if (hop && hopOffset < Math.abs(distance)){
                    // respect that target might be above current visible area
                    win.scrollTo(0, offset - (hopOffset * (distance > 0 ? 1 : -1)));
                }
                $viewport.animate({
                    scrollTop: offset
                });
            // scroll to page top
            } else if (targetId == ANCHOR_PREFIX +'_top'){
                if (hop && hopOffset < $viewport.scrollTop()){
                    win.scrollTo(0, hopOffset);
                }
                $viewport.animate({
                    scrollTop: 0
                });
            }
        } catch (e){}
    };

    // on document ready select the viewport & if location hash contains valid jump mark and scroll there
    $(function(){
        $viewport = $('html, body');
        if (win.location.hash && win.location.hash.match(new RegExp('^#'+ ANCHOR_PREFIX))){
            scrollTo(win.location.hash.slice(1), true);
        }
    });

    // automatically handle all clicks on jump marks
    $doc.on('click', 'a[href^="#'+ ANCHOR_PREFIX +'"]', function(){
        scrollTo(this.hash.slice(1), false);
    });

})(jQuery, window, document);
