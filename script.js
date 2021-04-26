'use strict';

//re-assing map to a global varibale to make it globally accessible
let map, mapEvent;

class WorkOut {
    date = new Date();
    id = (Date.now() + '').slice(-10) //creating id by converting date into string and taking its last 10 digits
    clicks = 0

    constructor(coords, distance, duration) {
        // this.date = ... 
        // this.id = ....
        this.coords = coords;     //[lat,lng]
        this.distance = distance; // in km
        this.duration = duration; // in min

    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++
    }
}

//Running class
class Running extends WorkOut {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance
        return this.pace
    }
}

//Cyclign class
class Clycling extends WorkOut {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/hour
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}

// const run1 = new Running([39, -12], 5.2, 24, 178)
// const cycling1 = new Clycling([39, -12], 27, 95, 523)
// console.log(run1, cycling1);


///////////////////////////////////////////////////////////////////////////////////
//AAPLICATOIN ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    //Private instances 
    #map;
    #mapZoomLevel = 13
    #mapEvent;
    #workouts = [];

    constructor() {
        //Get user's position
        //we are adding these here cuz constructor are called first as soon as the new object is created and we want these(mainly EventHandlers) to run prior to other codes/Methods in class so we put it here
        this._getPosition();

        //Get data from local storage
        this._getLocalStorage();


        //attach eventHandlers 
        //In the eventHandler ,the this keyword  of function "this._newWorkOut" alwasy points to  its parent , "form" .But we want it to point to the class so we use bind to do it ,as Bind returns new function with the class pointed this(here)
        form.addEventListener('submit', this._newWorkout.bind(this))
        // On changing the input type Running /Cycling 
        inputType.addEventListener('change', this._toggelElevationField)

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }

    _getPosition() {
        //Use of GeoLocation 2 callbacks 1st - succecss : 2nd - failed
        if (navigator.geolocation) {
            //here the _loadMap is taken in as a function and not as a method,and function this is undefiend,so we bind this manually to it as bind return a new function 
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert("Could not get you position")
            })
        }
    }

    _loadMap(position) {
        const { latitude } = position.coords
        const { longitude } = position.coords
        const coords = [latitude, longitude]

        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
        //   

        //Loading Map
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(map);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //Handling clicks on Map 
        //the eventhandler points to the object to which it is attached but we want it to points to class so we use bind(this)
        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden')
        inputDistance.focus();
    }

    _hideForm() {
        //Empty inputs 
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ''

        form.style.display = 'none'
        form.classList.remove('hidden')
        setTimeout(() => (form.style.display = 'grid'), 1000)
    }

    _toggelElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp)) //returns true if every input is true
        const allPositive = (...inputs) => inputs.every(inp => inp > 0) //returns true if every input is a positive number


        e.preventDefault();//prevents submitting of the form

        //Get data form the form 
        const type = inputType.value;
        const distance = +inputDistance.value
        const duration = +inputDuration.value
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        //check the validation

        //if activity=running ,create running obj
        if (type == 'running') {
            const cadence = +inputCadence.value;
            //check if the data  is valid
            if (
                // !Number.isFinite(distance) || 
                // !Number.isFinite(duration) || 
                // !Number.isFinite(cadence)

                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
            ) return alert("inputs has to be  positive number")

            workout = new Running([lat, lng], distance, duration, cadence)


        }
        //if the activity is cycling, create cycling obj
        if (type == 'cycling') {
            const elevation = +inputElevation.value;
            //check if the data  is valid
            if (
                // !Number.isFinite(distance) || 
                // !Number.isFinite(duration) || 
                // !Number.isFinite(cadence)

                !validInputs(distance, duration, elevation) || !allPositive(distance, duration)
            ) return alert("inputs has to be  positive number")

            workout = new Clycling([lat, lng], distance, duration, elevation)


        }

        //Add new obj to workout arr
        this.#workouts.push(workout)


        //Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //Render workout on list
        this._renderWorkout(workout)

        //Hide form + Clear input fields
        this._hideForm()

        //clear input Fileds Value
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = " "

        //Display Marker


        //Set local Storage to all workouts 
        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if (workout.type === 'running') {
            html += `
              <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`
        }

        if (workout.type === "cycling") {
            html += `
           <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`
        }

        form.insertAdjacentHTML('afterend', html);
    }


    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout')


        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)


        //setView(coords,ZoomLevel,objects)
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duraton: 1,
            }
        })

        //using the publiv interface
        //the objects coming from the localStorage dont inherite all the properties/ methods of class therefore click doesnt work 
        // workout.click()

    }

    _setLocalStorage() {
        //we can convert object to string using JSON.stringify
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))

    }

    _getLocalStorage() {

        // JSON.parse converts the string to object , opposite of JSON.stringify
        const data = JSON.parse(localStorage.getItem('workouts'))
        // console.log(data);

        if (!data) return

        this.#workouts = data
        this.#workouts.forEach(work => {
            this._renderWorkout(work)

        })


    }
    reset() {
        localStorage.removeItem('workouts')
        location.reload(); // to re-load page
    }

}

const app = new App()


