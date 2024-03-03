class Playlist {
    constructor(playlist) {
        this.data = {
            spotify_id: playlist.id,
            target_id: playlist.owner.id,
            name: playlist.name,
            desc: playlist.description,
            snapshot_id: playlist.snapshot_id
        }
    }

    get() {
        return this.data
    }
}

module.exports = Playlist