// =============================================================
// MOBILE PLATFORM + SENSOR + WEBXR DIAGNOSTICS
// =============================================================

AFRAME.registerComponent(
    'mobile-platform',
    {

        init: function () {

            this.isMobile =
                /Android|iPhone|iPad|iPod|Mobile/i.test(
                    navigator.userAgent
                );


            const camera =
                this.el.querySelector(
                    '#main-camera'
                );


            if (!camera) {
                return;
            }


            // =================================================
            // MOBILE
            // =================================================

            if (this.isMobile) {

                // Smartphone:
                // IMU controls orientation only.
                // No artificial translation.

                camera.setAttribute(
                    'wasd-controls',
                    {
                        enabled: false
                    }
                );


                camera.setAttribute(
                    'look-controls',
                    {
                        enabled: true,

                        magicWindowTrackingEnabled:
                            true,

                        touchEnabled:
                            false,

                        mouseEnabled:
                            false
                    }
                );


                document.body.classList.add(
                    'mobile-device'
                );

            }


            // =================================================
            // DESKTOP
            // =================================================

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

                        magicWindowTrackingEnabled:
                            false,

                        touchEnabled:
                            true,

                        mouseEnabled:
                            true
                    }
                );

            }

        }

    }
);



// =============================================================
// SENSOR + WEBXR HUD
// =============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        // =====================================================
        // INTERFACE ELEMENTS
        // =====================================================

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


        const sensorStatus =
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
        // ORIENTATION VALUES
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


        // =====================================================
        // ACCELERATION VALUES
        // =====================================================

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


        // =====================================================
        // ACCELERATION + GRAVITY
        // =====================================================

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


        // =====================================================
        // ROTATION RATE
        // =====================================================

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
        // WEBXR DIAGNOSTIC ELEMENTS
        // =====================================================

        const secureContextValue =
            document.getElementById(
                'diag-secure-context'
            );


        const webxrApiValue =
            document.getElementById(
                'diag-webxr-api'
            );


        const immersiveVrValue =
            document.getElementById(
                'diag-immersive-vr'
            );


        const immersiveArValue =
            document.getElementById(
                'diag-immersive-ar'
            );


        const orientationStateValue =
            document.getElementById(
                'diag-orientation'
            );


        const motionStateValue =
            document.getElementById(
                'diag-motion'
            );


        const browserValue =
            document.getElementById(
                'diag-browser'
            );


        const platformValue =
            document.getElementById(
                'diag-platform'
            );


        // =====================================================
        // SENSOR ACTIVITY STATES
        // =====================================================

        let orientationReceived =
            false;


        let motionReceived =
            false;


        // =====================================================
        // FORMAT NUMBER
        // =====================================================

        function formatValue(
            value
        ) {

            if (
                value === null ||
                value === undefined ||
                Number.isNaN(value)
            ) {

                return '--';

            }


            return Number(
                value
            ).toFixed(
                2
            );

        }


        // =====================================================
        // SET DIAGNOSTIC VALUE
        // =====================================================

        function setDiagnostic(
            element,
            text,
            state
        ) {

            if (!element) {
                return;
            }


            element.textContent =
                text;


            element.classList.remove(
                'diag-good',
                'diag-bad',
                'diag-warn'
            );


            if (
                state === 'good'
            ) {

                element.classList.add(
                    'diag-good'
                );

            }


            else if (
                state === 'bad'
            ) {

                element.classList.add(
                    'diag-bad'
                );

            }


            else {

                element.classList.add(
                    'diag-warn'
                );

            }

        }


        // =====================================================
        // BROWSER DETECTION
        // =====================================================

        function detectBrowser() {

            const userAgent =
                navigator.userAgent;


            if (
                /Firefox/i.test(
                    userAgent
                )
            ) {

                return 'Firefox';

            }


            if (
                /Edg/i.test(
                    userAgent
                )
            ) {

                return 'Microsoft Edge';

            }


            if (
                /OPR|Opera/i.test(
                    userAgent
                )
            ) {

                return 'Opera';

            }


            if (
                /SamsungBrowser/i.test(
                    userAgent
                )
            ) {

                return 'Samsung Internet';

            }


            if (
                /Chrome|CriOS/i.test(
                    userAgent
                )
            ) {

                return 'Chrome / Chromium';

            }


            if (
                /Safari/i.test(
                    userAgent
                )
            ) {

                return 'Safari';

            }


            return 'Unknown browser';

        }


        // =====================================================
        // PLATFORM DETECTION
        // =====================================================

        function detectPlatform() {

            const userAgent =
                navigator.userAgent;


            if (
                /Android/i.test(
                    userAgent
                )
            ) {

                return 'Android';

            }


            if (
                /iPhone|iPad|iPod/i.test(
                    userAgent
                )
            ) {

                return 'iOS / iPadOS';

            }


            if (
                /Windows/i.test(
                    userAgent
                )
            ) {

                return 'Windows';

            }


            if (
                /Macintosh|Mac OS/i.test(
                    userAgent
                )
            ) {

                return 'macOS';

            }


            if (
                /Linux/i.test(
                    userAgent
                )
            ) {

                return 'Linux';

            }


            return navigator.platform ||
                'Unknown platform';

        }


        // =====================================================
        // DEVICE ORIENTATION EVENT
        // =====================================================

        function orientationHandler(
            event
        ) {

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


            if (
                !orientationReceived
            ) {

                orientationReceived =
                    true;


                setDiagnostic(
                    orientationStateValue,
                    'ACTIVE',
                    'good'
                );

            }


            sensorStatus.textContent =
                'Orientation sensor active';

        }


        // =====================================================
        // DEVICE MOTION EVENT
        // =====================================================

        function motionHandler(
            event
        ) {

            // -------------------------------------------------
            // LINEAR ACCELERATION
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
            // ACCELERATION INCLUDING GRAVITY
            // -------------------------------------------------

            if (
                event
                    .accelerationIncludingGravity
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
            // ROTATION RATE
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


            if (
                !motionReceived
            ) {

                motionReceived =
                    true;


                setDiagnostic(
                    motionStateValue,
                    'ACTIVE',
                    'good'
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


            sensorStatus.textContent =
                'Waiting for sensor data...';


            setDiagnostic(
                orientationStateValue,
                'WAITING',
                'warn'
            );


            setDiagnostic(
                motionStateValue,
                'WAITING',
                'warn'
            );

        }


        // =====================================================
        // SENSOR PERMISSION REQUEST
        // =====================================================

        async function requestSensorPermission() {

            let permissionNeeded =
                false;


            try {

                // ---------------------------------------------
                // DEVICE ORIENTATION PERMISSION
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

                        sensorStatus.textContent =
                            'Orientation permission denied';


                        setDiagnostic(
                            orientationStateValue,
                            'DENIED',
                            'bad'
                        );


                        return;

                    }

                }


                // ---------------------------------------------
                // DEVICE MOTION PERMISSION
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

                        sensorStatus.textContent =
                            'Motion permission denied';


                        setDiagnostic(
                            motionStateValue,
                            'DENIED',
                            'bad'
                        );


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


            catch (
                error
            ) {

                console.error(
                    'Sensor permission error:',
                    error
                );


                sensorStatus.textContent =
                    'Sensor permission error';

            }


            // Android and other platforms that
            // do not require explicit permission.

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
        // WEBXR DIAGNOSTICS
        // =====================================================

        async function runWebXRDiagnostics() {

            // -------------------------------------------------
            // SECURE CONTEXT
            // -------------------------------------------------

            if (
                window.isSecureContext
            ) {

                setDiagnostic(
                    secureContextValue,
                    'YES',
                    'good'
                );

            }

            else {

                setDiagnostic(
                    secureContextValue,
                    'NO',
                    'bad'
                );

            }


            // -------------------------------------------------
            // BROWSER + PLATFORM
            // -------------------------------------------------

            if (
                browserValue
            ) {

                browserValue.textContent =
                    detectBrowser();

            }


            if (
                platformValue
            ) {

                platformValue.textContent =
                    detectPlatform();

            }


            // -------------------------------------------------
            // WEBXR API
            // -------------------------------------------------

            if (
                !navigator.xr
            ) {

                setDiagnostic(
                    webxrApiValue,
                    'NO',
                    'bad'
                );


                setDiagnostic(
                    immersiveVrValue,
                    'UNAVAILABLE',
                    'bad'
                );


                setDiagnostic(
                    immersiveArValue,
                    'UNAVAILABLE',
                    'bad'
                );


                return;

            }


            setDiagnostic(
                webxrApiValue,
                'YES',
                'good'
            );


            // -------------------------------------------------
            // IMMERSIVE VR
            // -------------------------------------------------

            try {

                const vrSupported =
                    await navigator.xr
                        .isSessionSupported(
                            'immersive-vr'
                        );


                setDiagnostic(
                    immersiveVrValue,

                    vrSupported
                        ? 'YES'
                        : 'NO',

                    vrSupported
                        ? 'good'
                        : 'bad'
                );

            }


            catch (
                error
            ) {

                console.error(
                    'Immersive VR check error:',
                    error
                );


                setDiagnostic(
                    immersiveVrValue,
                    'ERROR',
                    'bad'
                );

            }


            // -------------------------------------------------
            // IMMERSIVE AR
            // -------------------------------------------------

            try {

                const arSupported =
                    await navigator.xr
                        .isSessionSupported(
                            'immersive-ar'
                        );


                setDiagnostic(
                    immersiveArValue,

                    arSupported
                        ? 'YES'
                        : 'NO',

                    arSupported
                        ? 'good'
                        : 'bad'
                );

            }


            catch (
                error
            ) {

                console.error(
                    'Immersive AR check error:',
                    error
                );


                setDiagnostic(
                    immersiveArValue,
                    'ERROR',
                    'bad'
                );

            }

        }


        // =====================================================
        // SENSOR PANEL TOGGLE
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
        // AUTO START SENSOR LISTENERS
        // =====================================================

        const requiresExplicitPermission =
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
            !requiresExplicitPermission
        ) {

            startSensors();


            if (
                permissionButton
            ) {

                permissionButton.style.display =
                    'none';

            }

        }


        // =====================================================
        // RUN WEBXR TEST
        // =====================================================

        runWebXRDiagnostics();

    }
);