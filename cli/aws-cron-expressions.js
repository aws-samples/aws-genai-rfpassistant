"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yearRegex = exports.dayOfWeekRegex = exports.monthRegex = exports.dayOfMonthRegex = exports.hourRegex = exports.minuteRegex = exports.dayOfWeekHash = exports.numbers = exports.yearExp = exports.dayOfWeekExp = exports.monthExp = exports.dayOfMonthExp = exports.hourExp = exports.minuteExp = void 0;
exports.minuteExp = `(0?[0-9]|[1-5][0-9])`; // [0]0-59
exports.hourExp = `(0?[0-9]|1[0-9]|2[0-3])`; // [0]0-23
exports.dayOfMonthExp = `(0?[1-9]|[1-2][0-9]|3[0-1])`; // [0]1-31
exports.monthExp = `(0?[1-9]|1[0-2]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)`; // [0]1-12 or JAN-DEC
exports.dayOfWeekExp = `([1-7]|SUN|MON|TUE|WED|THU|FRI|SAT)`; // 1-7 or SAT-SUN
exports.yearExp = `((19[8-9][0-9])|(2[0-1][0-9][0-9]))`; // 1980-2199
exports.numbers = `([0-9]*[1-9][0-9]*)`; // whole numbers greater than 0
function dayOfWeekHash() {
    return `(${exports.dayOfWeekExp}#[1-5])`; // add hash expression to enable supported use case
}
exports.dayOfWeekHash = dayOfWeekHash;
function rangeRegex(values) {
    return `(${values}|(\\*\\-${values})|(${values}\\-${values})|(${values}\\-\\*))`;
}
function listRangeRegex(values) {
    const range = rangeRegex(values);
    return `(${range}(\\,${range})*)`;
}
function slashRegex(values) {
    const range = rangeRegex(values);
    return `((\\*|${range}|${values})\\/${exports.numbers})`;
}
function listSlashRegex(values) {
    const slash = slashRegex(values);
    const slashOrRange = `(${slash}|${rangeRegex(values)})`;
    return `(${slashOrRange}(\\,${slashOrRange})*)`;
}
function commonRegex(values) {
    return `(${listRangeRegex(values)}|\\*|${listSlashRegex(values)})`;
}
function minuteRegex() {
    return `^(${commonRegex(exports.minuteExp)})$`;
}
exports.minuteRegex = minuteRegex;
function hourRegex() {
    return `^(${commonRegex(exports.hourExp)})$`;
}
exports.hourRegex = hourRegex;
function dayOfMonthRegex() {
    return `^(${commonRegex(exports.dayOfMonthExp)}|\\?|L|LW|${exports.dayOfMonthExp}W)$`;
}
exports.dayOfMonthRegex = dayOfMonthRegex;
function monthRegex() {
    return `^(${commonRegex(exports.monthExp)})$`;
}
exports.monthRegex = monthRegex;
function dayOfWeekRegex() {
    const rangeList = listRangeRegex(exports.dayOfWeekExp);
    return `^(${rangeList}|\\*|\\?|${exports.dayOfWeekExp}L|L|L-[1-7]|${dayOfWeekHash()})$`;
}
exports.dayOfWeekRegex = dayOfWeekRegex;
function yearRegex() {
    return `^(${commonRegex(exports.yearExp)})$`;
}
exports.yearRegex = yearRegex;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLWNyb24tZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhd3MtY3Jvbi1leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBYSxRQUFBLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLFVBQVU7QUFDOUMsUUFBQSxPQUFPLEdBQUcseUJBQXlCLENBQUMsQ0FBQyxVQUFVO0FBQy9DLFFBQUEsYUFBYSxHQUFHLDZCQUE2QixDQUFDLENBQUMsVUFBVTtBQUN6RCxRQUFBLFFBQVEsR0FBRyxrRUFBa0UsQ0FBQyxDQUFDLHFCQUFxQjtBQUNwRyxRQUFBLFlBQVksR0FBRyxxQ0FBcUMsQ0FBQyxDQUFDLGlCQUFpQjtBQUN2RSxRQUFBLE9BQU8sR0FBRyxxQ0FBcUMsQ0FBQyxDQUFDLFlBQVk7QUFDN0QsUUFBQSxPQUFPLEdBQUcscUJBQXFCLENBQUMsQ0FBQywrQkFBK0I7QUFFN0UsU0FBZ0IsYUFBYTtJQUN6QixPQUFPLElBQUksb0JBQVksU0FBUyxDQUFDLENBQUMsbURBQW1EO0FBQ3pGLENBQUM7QUFGRCxzQ0FFQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTyxJQUFJLE1BQU0sV0FBVyxNQUFNLE1BQU0sTUFBTSxNQUFNLE1BQU0sTUFBTSxNQUFNLFVBQVUsQ0FBQztBQUNyRixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsTUFBYztJQUNsQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsT0FBTyxJQUFJLEtBQUssT0FBTyxLQUFLLEtBQUssQ0FBQztBQUN0QyxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsTUFBYztJQUM5QixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsT0FBTyxTQUFTLEtBQUssSUFBSSxNQUFNLE9BQU8sZUFBTyxHQUFHLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLE1BQWM7SUFDbEMsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sWUFBWSxHQUFHLElBQUksS0FBSyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ3hELE9BQU8sSUFBSSxZQUFZLE9BQU8sWUFBWSxLQUFLLENBQUM7QUFDcEQsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE1BQWM7SUFDL0IsT0FBTyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUN2RSxDQUFDO0FBRUQsU0FBZ0IsV0FBVztJQUN2QixPQUFPLEtBQUssV0FBVyxDQUFDLGlCQUFTLENBQUMsSUFBSSxDQUFDO0FBQzNDLENBQUM7QUFGRCxrQ0FFQztBQUVELFNBQWdCLFNBQVM7SUFDckIsT0FBTyxLQUFLLFdBQVcsQ0FBQyxlQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3pDLENBQUM7QUFGRCw4QkFFQztBQUVELFNBQWdCLGVBQWU7SUFDM0IsT0FBTyxLQUFLLFdBQVcsQ0FBQyxxQkFBYSxDQUFDLGFBQWEscUJBQWEsS0FBSyxDQUFDO0FBQzFFLENBQUM7QUFGRCwwQ0FFQztBQUVELFNBQWdCLFVBQVU7SUFDdEIsT0FBTyxLQUFLLFdBQVcsQ0FBQyxnQkFBUSxDQUFDLElBQUksQ0FBQztBQUMxQyxDQUFDO0FBRkQsZ0NBRUM7QUFFRCxTQUFnQixjQUFjO0lBQzFCLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxvQkFBWSxDQUFDLENBQUM7SUFDL0MsT0FBTyxLQUFLLFNBQVMsWUFBWSxvQkFBWSxlQUFlLGFBQWEsRUFBRSxJQUFJLENBQUM7QUFDcEYsQ0FBQztBQUhELHdDQUdDO0FBRUQsU0FBZ0IsU0FBUztJQUNyQixPQUFPLEtBQUssV0FBVyxDQUFDLGVBQU8sQ0FBQyxJQUFJLENBQUM7QUFDekMsQ0FBQztBQUZELDhCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IG1pbnV0ZUV4cCA9IGAoMD9bMC05XXxbMS01XVswLTldKWA7IC8vIFswXTAtNTlcbmV4cG9ydCBjb25zdCBob3VyRXhwID0gYCgwP1swLTldfDFbMC05XXwyWzAtM10pYDsgLy8gWzBdMC0yM1xuZXhwb3J0IGNvbnN0IGRheU9mTW9udGhFeHAgPSBgKDA/WzEtOV18WzEtMl1bMC05XXwzWzAtMV0pYDsgLy8gWzBdMS0zMVxuZXhwb3J0IGNvbnN0IG1vbnRoRXhwID0gYCgwP1sxLTldfDFbMC0yXXxKQU58RkVCfE1BUnxBUFJ8TUFZfEpVTnxKVUx8QVVHfFNFUHxPQ1R8Tk9WfERFQylgOyAvLyBbMF0xLTEyIG9yIEpBTi1ERUNcbmV4cG9ydCBjb25zdCBkYXlPZldlZWtFeHAgPSBgKFsxLTddfFNVTnxNT058VFVFfFdFRHxUSFV8RlJJfFNBVClgOyAvLyAxLTcgb3IgU0FULVNVTlxuZXhwb3J0IGNvbnN0IHllYXJFeHAgPSBgKCgxOVs4LTldWzAtOV0pfCgyWzAtMV1bMC05XVswLTldKSlgOyAvLyAxOTgwLTIxOTlcbmV4cG9ydCBjb25zdCBudW1iZXJzID0gYChbMC05XSpbMS05XVswLTldKilgOyAvLyB3aG9sZSBudW1iZXJzIGdyZWF0ZXIgdGhhbiAwXG5cbmV4cG9ydCBmdW5jdGlvbiBkYXlPZldlZWtIYXNoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAoJHtkYXlPZldlZWtFeHB9I1sxLTVdKWA7IC8vIGFkZCBoYXNoIGV4cHJlc3Npb24gdG8gZW5hYmxlIHN1cHBvcnRlZCB1c2UgY2FzZVxufVxuXG5mdW5jdGlvbiByYW5nZVJlZ2V4KHZhbHVlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCgke3ZhbHVlc318KFxcXFwqXFxcXC0ke3ZhbHVlc30pfCgke3ZhbHVlc31cXFxcLSR7dmFsdWVzfSl8KCR7dmFsdWVzfVxcXFwtXFxcXCopKWA7XG59XG5cbmZ1bmN0aW9uIGxpc3RSYW5nZVJlZ2V4KHZhbHVlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByYW5nZSA9IHJhbmdlUmVnZXgodmFsdWVzKTtcbiAgICByZXR1cm4gYCgke3JhbmdlfShcXFxcLCR7cmFuZ2V9KSopYDtcbn1cblxuZnVuY3Rpb24gc2xhc2hSZWdleCh2YWx1ZXM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmFuZ2UgPSByYW5nZVJlZ2V4KHZhbHVlcyk7XG4gICAgcmV0dXJuIGAoKFxcXFwqfCR7cmFuZ2V9fCR7dmFsdWVzfSlcXFxcLyR7bnVtYmVyc30pYDtcbn1cblxuZnVuY3Rpb24gbGlzdFNsYXNoUmVnZXgodmFsdWVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNsYXNoID0gc2xhc2hSZWdleCh2YWx1ZXMpO1xuICAgIGNvbnN0IHNsYXNoT3JSYW5nZSA9IGAoJHtzbGFzaH18JHtyYW5nZVJlZ2V4KHZhbHVlcyl9KWA7XG4gICAgcmV0dXJuIGAoJHtzbGFzaE9yUmFuZ2V9KFxcXFwsJHtzbGFzaE9yUmFuZ2V9KSopYDtcbn1cblxuZnVuY3Rpb24gY29tbW9uUmVnZXgodmFsdWVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBgKCR7bGlzdFJhbmdlUmVnZXgodmFsdWVzKX18XFxcXCp8JHtsaXN0U2xhc2hSZWdleCh2YWx1ZXMpfSlgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWludXRlUmVnZXgoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYF4oJHtjb21tb25SZWdleChtaW51dGVFeHApfSkkYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhvdXJSZWdleCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgXigke2NvbW1vblJlZ2V4KGhvdXJFeHApfSkkYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRheU9mTW9udGhSZWdleCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgXigke2NvbW1vblJlZ2V4KGRheU9mTW9udGhFeHApfXxcXFxcP3xMfExXfCR7ZGF5T2ZNb250aEV4cH1XKSRgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW9udGhSZWdleCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgXigke2NvbW1vblJlZ2V4KG1vbnRoRXhwKX0pJGA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkYXlPZldlZWtSZWdleCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJhbmdlTGlzdCA9IGxpc3RSYW5nZVJlZ2V4KGRheU9mV2Vla0V4cCk7XG4gICAgcmV0dXJuIGBeKCR7cmFuZ2VMaXN0fXxcXFxcKnxcXFxcP3wke2RheU9mV2Vla0V4cH1MfEx8TC1bMS03XXwke2RheU9mV2Vla0hhc2goKX0pJGA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB5ZWFyUmVnZXgoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYF4oJHtjb21tb25SZWdleCh5ZWFyRXhwKX0pJGA7XG59XG4iXX0=