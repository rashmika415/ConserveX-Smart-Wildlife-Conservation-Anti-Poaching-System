import bcrypt from 'bcryptjs';
import {
  User,
  Animal,
  Collar,
  CollarReading,
  RiskZone,
  Patrol,
  Incident,
  CommunityReport,
  Alert,
} from '../models/index.js';
import { recordReading } from './tracking.js';
// Re-running seeds fills missing examples without deleting reports or resetting passwords.
export async function seedDemo() {
  const definitions = [
    ['M001', 'Nimal Perera', 'manager@wildlife.lk', 'Manager123!', 'MANAGER'],
    ['R001', 'Kasun Silva', 'ranger@wildlife.lk', 'Ranger123!', 'RANGER'],
    ['C001', 'Amali Fernando', 'officer@wildlife.lk', 'Officer123!', 'LIAISON'],
  ];
  const users = [];
  for (const [userId, name, email, password, role] of definitions) {
    let user = await User.findOne({ $or: [{ email }, { userId }] }).select(
      '+password',
    );
    if (!user)
      user = await User.create({
        userId,
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role,
      });
    else if (!user.password) {
      user.set({ email, password: await bcrypt.hash(password, 12), role });
      await user.save();
    }
    users.push(user);
  }
  const [manager, ranger] = users;
  const zones = [
    {
      zoneName: 'Village Boundary Zone',
      description: 'Elephant movement near the eastern village boundary.',
      centerLatitude: 6.45,
      centerLongitude: 81.4,
      radius: 1500,
      riskLevel: 'High',
    },
    {
      zoneName: 'Main Road Crossing',
      description: 'Vehicle crossing along the northern access road.',
      centerLatitude: 6.49,
      centerLongitude: 81.43,
      radius: 800,
      riskLevel: 'Critical',
    },
    {
      zoneName: 'Farmland Buffer Area',
      description: 'Cultivated land adjoining the protected area.',
      centerLatitude: 6.42,
      centerLongitude: 81.37,
      radius: 1200,
      riskLevel: 'High',
    },
  ];
  for (const zone of zones)
    await RiskZone.updateOne(
      { zoneName: zone.zoneName },
      { $setOnInsert: zone },
      { upsert: true },
    );
  for (const [animalId, species, collarId, age, gender, batteryLevel] of [
    ['E-042', 'Elephant', 'GPS-C102', 24, 'Female', 86],
    ['E-018', 'Elephant', 'GPS-C118', 17, 'Male', 64],
    ['L-007', 'Leopard', 'GPS-C207', 8, 'Female', 92],
  ]) {
    const animal = await Animal.findOneAndUpdate(
      { animalId },
      {
        $setOnInsert: {
          animalId,
          species,
          collarId,
          tagName: `${species} ${animalId}`,
          age,
          gender,
          status: 'Monitored',
        },
      },
      { new: true, upsert: true },
    );
    await Collar.updateOne(
      { collarId },
      {
        $setOnInsert: {
          collarId,
          animalId: animal._id,
          batteryLevel,
          status: 'Active',
        },
      },
      { upsert: true },
    );
    if (!(await CollarReading.exists({ collarId })))
      await recordReading({
        collarId,
        latitude: animalId === 'E-042' ? 6.45 : 6.52,
        longitude: animalId === 'E-042' ? 81.4 : 81.5,
      });
  }
  const checkpoints = [
    { name: 'East gate', location: { latitude: 6.46, longitude: 81.41 } },
    {
      name: 'Waterhole lookout',
      location: { latitude: 6.47, longitude: 81.42 },
    },
  ];
  if (!(await Patrol.exists({ routeName: 'Eastern boundary sweep' })))
    await Patrol.create({
      routeName: 'Eastern boundary sweep',
      parkName: 'Yala National Park',
      rangerId: ranger._id,
      scheduledDate: new Date(),
      checkpoints,
      createdBy: manager._id,
    });
  if (!(await Patrol.exists({ routeName: 'Waterhole observation' })))
    await Patrol.create({
      routeName: 'Waterhole observation',
      parkName: 'Yala National Park',
      rangerId: ranger._id,
      scheduledDate: new Date(Date.now() - 86400000),
      checkpoints,
      createdBy: manager._id,
      status: 'Completed',
      startTime: new Date(Date.now() - 9000000),
      endTime: new Date(Date.now() - 1800000),
      durationMinutes: 120,
      waypoints: [
        {
          location: checkpoints[1].location,
          type: 'Wildlife',
          description: 'Elephant herd observed near water.',
          recordedAt: new Date(Date.now() - 5000000),
        },
      ],
    });
  for (const [incidentType, description, status] of [
    [
      'Snare / Trap',
      'Wire snare located along the eastern boundary. Area secured.',
      'Reported',
    ],
    [
      'Injured Animal',
      'Deer with a minor leg injury observed near the waterhole.',
      'Under Review',
    ],
  ]) {
    if (!(await Incident.exists({ description })))
      await Incident.create({
        incidentType,
        description,
        status,
        rangerId: ranger._id,
        location: { latitude: 6.46, longitude: 81.41 },
        syncStatus: 'Synced',
      });
  }
  if (
    !(await CommunityReport.exists({
      landmark: 'Palatupana village water tank',
    }))
  )
    await CommunityReport.create({
      landmark: 'Palatupana village water tank',
      location: { latitude: 6.45, longitude: 81.4 },
      numberOfElephants: 3,
      directionOfMovement: 'East, towards the park',
      description: 'A small herd is moving along the edge of the village.',
      status: 'New',
    });
  await Promise.all(
    [
      User,
      Animal,
      Collar,
      CollarReading,
      RiskZone,
      Patrol,
      Incident,
      CommunityReport,
      Alert,
    ].map((model) => model.init()),
  );
  return { manager, ranger, liaison: users[2] };
}
