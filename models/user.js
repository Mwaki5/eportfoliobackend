"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User", // ✅ SINGULAR – critical
    {
      userId: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firstname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("student", "staff", "admin"),
        allowNull: false,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female"),
        allowNull: false,
      },
      level: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      profilePic: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "Users", // DB table remains plural
      timestamps: true,
    }
  );

  User.associate = (models) => {
    // Student enrollments
    User.hasMany(models.Enrollment, { foreignKey: "studentId" });

    // Staff teaches units
    User.hasMany(models.Unit, { foreignKey: "staffId" });
  };

  return User;
};
