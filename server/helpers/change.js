const _ = require('lodash')

class Change {
    constructor() {
        this.curr = false
        this.new = false
        this.type = null
    }

    setCurr() {
        this.curr = true
    }

    setNew() {
        this.new = true
    }

    check() {
        if (this.curr != this.new) {
            if (this.new) {
                this.type = 'add'
            }
            else {
                this.type = 'remove'
            }
            return true
        }
        return false
    }
}

class ChangeTracker {
    constructor(curr_items, new_items) {
        this.tracker = {}
        this.curr = curr_items
        this.new = new_items
    }

    get() {
        return this.tracker
    }

    addRemove() {

        this.tracker = {}

        var curr_ids = this.curr
        var new_ids = this.new

        if (!Array.isArray(this.curr)) {
            curr_ids = Object.keys(this.curr)
            new_ids = Object.keys(this.new)
        }

        curr_ids.forEach((id) => {
            if (!Object.keys(this.tracker).includes(id)) {
                this.tracker[id] = new Change()
            }
            this.tracker[id].setCurr()
        })

        new_ids.forEach((id) => {
            if (!Object.keys(this.tracker).includes(id)) {
                this.tracker[id] = new Change()
            }
            this.tracker[id].setNew()
        })

        this.tracker = _.pickBy(this.tracker, ((change) => {
            return change.check()
        }))

        return this.tracker
    }

    modified(key) {
        this.tracker = []
        Object.keys(this.new).forEach((id) => {
            if (this.curr[id] && this.new[id] &&
                this.curr[id][key] != this.new[id][key]) {
                    this.tracker.push(id)
                }
        })

        return this.tracker
    }
}

module.exports = ChangeTracker