module.exports = function createFifoQueue(length, options) {
	if (options == null) {
		options = {};
	}

	return {
		items: {},
		itemList: [],
		checkOverflow: function(){
			return (this.itemList.length > length);
		},
		has: function(item) {
			if (options.simpleValues) {
				return (this.items[item] != null);
			} else {
				return (this.itemList.filter(function(listItem){
					return (listItem === item);
				}).length > 0);
			}
		},
		get: function(i) {
			return this.itemList[i];
		},
		push: function(item) {
			this.itemList.push(item);
			
			if (options.simpleValues) {
				this.items[item] = true;
			}
			
			this.removeOverflow();
		},
		pushIfNew: function(item) {
			if (!this.has(item)) {
				this.push(item);
				return true;
			} else {
				return false;
			}
		},
		removeOverflow: function() {
			if (this.checkOverflow()) {
				var removableItem = this.itemList.shift();
				
				if (options.simpleValues) {
					delete this.items[removableItem];
				}
			}
		}
	}
}