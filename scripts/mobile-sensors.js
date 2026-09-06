// =============================================================
// MOBILE PLATFORM + SENSOR MONITOR
// =============================================================

AFRAME.registerComponent('mobile-platform', {

    init: function () {

        this.isMobile =
            /Android|iPhone|iPad|iPod|Mobile/i.test(
                navigator.userAgent
            );


        const camera =
            this.el.querySelector('#main-camera');


        if (!camera) {
            return;
        }


        // =====================================================
        // MOBILE
        // =====================================================

        if (this.isMobile) {

            // No WASD translation on smartphone.
            camera.setAttribute(
                'wasd-controls',
                'enabled',
                false
            );


            // IMU orientation only.
            // Touch dragging and mouse rotation are disabled.
            camera.setAttribute(
                'look-controls',
                {
                    enabled: true,
                    magicWindowTrackingEnabled: true,
                    touchEnabled: false,
                    mouseEnabled: false
                }
            );


            document.body.classList.add(
                'mobile-device'
            );

        }

        // =====================================================
        // DESKTOP
        // =====================================================

        else {

            camera.setAttribute(
                'wasd-controls',
                {
                    enabled: true,
                    acceleration: 18
                }
            );


            camera.setAttribute(
                'look-controls',
                {
                    enabled: true,
                    magicWindowTrackingEnabled: false,
                    touchEnabled: true,
                    mouseEnabled: true
                }
            );

        }

    }

});



// =============================================================
// SENSOR HUD
// =============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const sensorButton =
            document.getElementById(
                'sensor-toggle'
            );


        const permissionButton =
            document.getElementById(
                'sensor-permission'
            );


        const sensorPanel =
            document.getElementById(
                'sensor-panel'
            );


        const status =
            document.getElementById(
                'sensor-status'
            );


        if (
            !sensorButton ||
            !sensorPanel
        ) {
            return;
        }


        // =====================================================
        // SENSOR VALUES
        // =====================================================

        const orientationAlpha =
            document.getElementById(
                'orientation-alpha'
            );

        const orientationBeta =
            document.getElementById(
                'orientation-beta'
            );

        const orientationGamma =
            document.getElementById(
                'orientation-gamma'
            );


        const accelerationX =
            document.getElementById(
                'acceleration-x'
            );

        const accelerationY =
            document.getElementById(
                'acceleration-y'
            );

        const accelerationZ =
            document.getElementById(
                'acceleration-z'
            );


        const gravityX =
            document.getElementById(
                'gravity-x'
            );

        const gravityY =
            document.getElementById(
                'gravity-y'
            );

        const gravityZ =
            document.getElementById(
                'gravity-z'
            );


        const rotationAlpha =
            document.getElementById(
                'rotation-alpha'
            );

        const rotationBeta =
            document.getElementById(
                'rotation-beta'
            );

        const rotationGamma =
            document.getElementById(
                'rotation-gamma'
            );


        // =====================================================
        // FORMAT SENSOR NUMBER
        // =====================================================

        function formatValue(value) {

            if (
                value === null ||
                value === undefined ||
                Number.isNaN(value)
            ) {
                return '--';
            }


            return Number(
                value
            ).toFixed(2);

        }


        // =====================================================
        // DEVICE ORIENTATION
        // =====================================================

        function orientationHandler(event) {

            orientationAlpha.textContent =
                formatValue(
                    event.alpha
                );


            orientationBeta.textContent =
                formatValue(
                    event.beta
                );


            orientationGamma.textContent =
                formatValue(
                    event.gamma
                );


            status.textContent =
                'Orientation sensor active';

        }


        // =====================================================
        // DEVICE MOTION
        // =====================================================

        function motionHandler(event) {

            // -------------------------------------------------
            // Linear acceleration
            // -------------------------------------------------

            if (
                event.acceleration
            ) {

                accelerationX.textContent =
                    formatValue(
                        event.acceleration.x
                    );

                accelerationY.textContent =
                    formatValue(
                        event.acceleration.y
                    );

                accelerationZ.textContent =
                    formatValue(
                        event.acceleration.z
                    );

            }


            // -------------------------------------------------
            // Acceleration including gravity
            // -------------------------------------------------

            if (
                event.accelerationIncludingGravity
            ) {

                gravityX.textContent =
                    formatValue(
                        event
                            .accelerationIncludingGravity
                            .x
                    );

                gravityY.textContent =
                    formatValue(
                        event
                            .accelerationIncludingGravity
                            .y
                    );

                gravityZ.textContent =
                    formatValue(
                        event
                            .accelerationIncludingGravity
                            .z
                    );

            }


            // -------------------------------------------------
            // Gyroscope / rotation rate
            // -------------------------------------------------

            if (
                event.rotationRate
            ) {

                rotationAlpha.textContent =
                    formatValue(
                        event.rotationRate.alpha
                    );

                rotationBeta.textContent =
                    formatValue(
                        event.rotationRate.beta
                    );

                rotationGamma.textContent =
                    formatValue(
                        event.rotationRate.gamma
                    );

            }

        }


        // =====================================================
        // START SENSOR LISTENERS
        // =====================================================

        function startSensors() {

            window.addEventListener(
                'deviceorientation',
                orientationHandler,
                true
            );


            window.addEventListener(
                'devicemotion',
                motionHandler,
                true
            );


            status.textContent =
                'Waiting for sensor data...';

        }


        // =====================================================
        // REQUEST SENSOR PERMISSION
        // =====================================================

        async function requestSensorPermission() {

            let permissionNeeded =
                false;


            try {

                // ---------------------------------------------
                // iOS orientation permission
                // ---------------------------------------------

                if (
                    typeof DeviceOrientationEvent !==
                        'undefined'
                    &&
                    typeof DeviceOrientationEvent
                        .requestPermission ===
                        'function'
                ) {

                    permissionNeeded =
                        true;


                    const orientationPermission =
                        await DeviceOrientationEvent
                            .requestPermission();


                    if (
                        orientationPermission !==
                        'granted'
                    ) {

                        status.textContent =
                            'Orientation permission denied';

                        return;

                    }

                }


                // ---------------------------------------------
                // iOS motion permission
                // ---------------------------------------------

                if (
                    typeof DeviceMotionEvent !==
                        'undefined'
                    &&
                    typeof DeviceMotionEvent
                        .requestPermission ===
                        'function'
                ) {

                    permissionNeeded =
                        true;


                    const motionPermission =
                        await DeviceMotionEvent
                            .requestPermission();


                    if (
                        motionPermission !==
                        'granted'
                    ) {

                        status.textContent =
                            'Motion permission denied';

                        return;

                    }

                }


                startSensors();


                if (
                    permissionButton
                ) {

                    permissionButton.style.display =
                        'none';

                }

            }

            catch (error) {

                console.error(
                    'Sensor permission error:',
                    error
                );


                status.textContent =
                    'Sensor permission error';

            }


            // Android and platforms that do not use
            // explicit permission requests.

            if (
                !permissionNeeded
            ) {

                startSensors();


                if (
                    permissionButton
                ) {

                    permissionButton.style.display =
                        'none';

                }

            }

        }


        // =====================================================
        // HUD TOGGLE
        // =====================================================

        sensorButton.addEventListener(
            'click',
            () => {

                sensorPanel.classList.toggle(
                    'visible'
                );


                const visible =
                    sensorPanel.classList.contains(
                        'visible'
                    );


                sensorButton.textContent =
                    visible
                        ? 'Hide Sensors'
                        : 'Show Sensors';

            }
        );


        // =====================================================
        // PERMISSION BUTTON
        // =====================================================

        if (
            permissionButton
        ) {

            permissionButton.addEventListener(
                'click',
                requestSensorPermission
            );

        }


        // =====================================================
        // AUTO START WHERE PERMISSION IS NOT REQUIRED
        // =====================================================

        const requiresIOSPermission =
            (
                typeof DeviceOrientationEvent !==
                    'undefined'
                &&
                typeof DeviceOrientationEvent
                    .requestPermission ===
                    'function'
            )
            ||
            (
                typeof DeviceMotionEvent !==
                    'undefined'
                &&
                typeof DeviceMotionEvent
                    .requestPermission ===
                    'function'
            );


        if (
            !requiresIOSPermission
        ) {

            startSensors();


            if (
                permissionButton
            ) {

                permissionButton.style.display =
                    'none';

            }

        }

    }
);